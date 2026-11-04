/**
 * Servidor de apoio para os exercícios de Conectividade e Sincronização.
 *
 * Feito apenas com módulos nativos do Node (sem dependências) para facilitar
 * a execução: `node server.js` (porta padrão 3000, altere com PORT=xxxx).
 *
 * Rotas principais:
 *   GET    /status                         -> verificação simples
 *   GET    /lento?ms=8000                  -> responde depois de `ms` milissegundos (teste de timeout)
 *   GET    /config | POST /config          -> configura falhas simuladas
 *   GET    /tarefas?since=<marcador>       -> pull incremental (alteradas + excluídas)
 *   POST   /tarefas                        -> cria tarefa (respeita Idempotency-Key)
 *   PUT    /tarefas/:id                    -> edita tarefa (exige `versao`, responde 409 em conflito)
 *   DELETE /tarefas/:id                    -> exclui tarefa (soft delete / tombstone)
 *   GET    /admin/estatisticas             -> números para conferir duplicidade
 *   GET    /produtos?pagina=1&limite=20&campos=id,nome  -> lista paginada com ETag
 */
const http = require('node:http');
const crypto = require('node:crypto');
const { URL } = require('node:url');

const PORT = Number(process.env.PORT) || 3000;

// ---------------------------------------------------------------------------
// Estado em memória
// ---------------------------------------------------------------------------

/** @type {Map<string, {id:string,titulo:string,concluida:boolean,versao:number,atualizadoEm:number,excluida:boolean}>} */
const tarefas = new Map();

/** Respostas já enviadas por Idempotency-Key: chave -> { status, corpo } */
const idempotencia = new Map();

const estatisticas = {
  postsRecebidos: 0,
  postsRepetidos: 0,
  conflitos409: 0,
  falhasSimuladas: 0,
};

/**
 * Configuração de falhas:
 *  - falharProximas: as próximas N requisições em /tarefas respondem 503.
 *  - perderProximaResposta: o próximo POST /tarefas é PROCESSADO, mas a resposta
 *    enviada é 503 (simula a resposta se perdendo na rede). Serve para provar
 *    que o reenvio com a mesma Idempotency-Key não duplica a tarefa.
 *  - taxaFalha: probabilidade (0 a 1) de cada requisição em /tarefas falhar.
 *  - atrasoMs: atraso artificial em /tarefas e /produtos.
 */
const config = {
  falharProximas: 0,
  perderProximaResposta: false,
  taxaFalha: 0,
  atrasoMs: 0,
};

let relogio = Date.now();
/** Marcador monotônico para que duas alterações nunca tenham o mesmo instante. */
function agora() {
  relogio = Math.max(relogio + 1, Date.now());
  return relogio;
}

function semear() {
  const titulos = ['Estudar NetInfo', 'Revisar AsyncStorage', 'Implementar retry', 'Ler sobre ETag'];
  for (const titulo of titulos) {
    const id = crypto.randomUUID();
    tarefas.set(id, { id, titulo, concluida: false, versao: 1, atualizadoEm: agora(), excluida: false });
  }
}
semear();

// Produtos: 200 itens com campos "pesados" para comparar com ?campos=
const CATEGORIAS = ['Eletrônicos', 'Livros', 'Casa', 'Esporte', 'Moda'];
const produtos = Array.from({ length: 200 }, (_, i) => {
  const n = i + 1;
  return {
    id: n,
    nome: `Produto ${String(n).padStart(3, '0')}`,
    preco: Math.round((10 + ((n * 37) % 990) + (n % 100) / 100) * 100) / 100,
    categoria: CATEGORIAS[n % CATEGORIAS.length],
    estoque: (n * 13) % 75,
    descricao:
      `Descrição completa do produto ${n}. ` +
      'Este texto longo existe para deixar a resposta maior e mostrar a economia de dados ' +
      'quando o aplicativo pede apenas os campos de que realmente precisa.',
    imagem: `https://picsum.photos/seed/produto${n}/600/400`,
    fabricante: { nome: `Fabricante ${n % 17}`, pais: 'Brasil', site: `https://fabricante${n % 17}.exemplo.com` },
    avaliacoes: Array.from({ length: 3 }, (_, j) => ({
      usuario: `usuario${(n + j) % 50}`,
      nota: ((n + j) % 5) + 1,
      comentario: 'Comentário de exemplo sobre o produto, ocupando bytes na resposta.',
    })),
    tags: ['oferta', 'novo', 'popular'].slice(0, (n % 3) + 1),
  };
});

// ---------------------------------------------------------------------------
// Utilitários HTTP
// ---------------------------------------------------------------------------

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Idempotency-Key, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag, Idempotent-Replay, Content-Length',
};

function enviar(res, status, corpo, extras = {}) {
  const texto = corpo === undefined ? '' : JSON.stringify(corpo);
  res.writeHead(status, {
    ...CORS,
    ...(texto ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
    'Content-Length': Buffer.byteLength(texto),
    ...extras,
  });
  res.end(texto);
}

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let dados = '';
    req.on('data', (c) => (dados += c));
    req.on('end', () => {
      if (!dados) return resolve({});
      try {
        resolve(JSON.parse(dados));
      } catch {
        reject(new Error('JSON inválido'));
      }
    });
    req.on('error', reject);
  });
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/** Decide se esta requisição deve falhar de acordo com a configuração. */
function deveFalhar() {
  if (config.falharProximas > 0) {
    config.falharProximas -= 1;
    return true;
  }
  return config.taxaFalha > 0 && Math.random() < config.taxaFalha;
}

function publica(t) {
  const { excluida, ...resto } = t;
  return resto;
}

// ---------------------------------------------------------------------------
// Rotas
// ---------------------------------------------------------------------------

async function rotaTarefas(req, res, url, partes) {
  if (config.atrasoMs) await esperar(config.atrasoMs);
  if (deveFalhar()) {
    estatisticas.falhasSimuladas += 1;
    return enviar(res, 503, { erro: 'Falha simulada pelo servidor' });
  }

  const id = partes[1];

  // GET /tarefas?since=123
  if (req.method === 'GET' && !id) {
    const since = Number(url.searchParams.get('since') || 0);
    const marcador = agora();
    const mudadas = [...tarefas.values()].filter((t) => t.atualizadoEm > since);
    return enviar(res, 200, {
      alteradas: mudadas.filter((t) => !t.excluida).map(publica),
      // Na primeira carga (since=0) não faz sentido mandar as excluídas.
      excluidas: since ? mudadas.filter((t) => t.excluida).map((t) => t.id) : [],
      marcador,
    });
  }

  // POST /tarefas  (Idempotency-Key)
  if (req.method === 'POST' && !id) {
    estatisticas.postsRecebidos += 1;
    const chave = req.headers['idempotency-key'];
    if (chave && idempotencia.has(chave)) {
      estatisticas.postsRepetidos += 1;
      const anterior = idempotencia.get(chave);
      return enviar(res, anterior.status, anterior.corpo, { 'Idempotent-Replay': 'true' });
    }
    const corpo = await lerCorpo(req);
    if (!corpo.titulo || typeof corpo.titulo !== 'string') {
      return enviar(res, 400, { erro: 'Campo "titulo" é obrigatório' });
    }
    const novoId = typeof corpo.id === 'string' && corpo.id ? corpo.id : crypto.randomUUID();
    if (tarefas.has(novoId)) {
      return enviar(res, 409, { erro: 'Já existe tarefa com este id', atual: publica(tarefas.get(novoId)) });
    }
    const tarefa = {
      id: novoId,
      titulo: corpo.titulo.trim(),
      concluida: Boolean(corpo.concluida),
      versao: 1,
      atualizadoEm: agora(),
      excluida: false,
    };
    tarefas.set(novoId, tarefa);
    const resposta = { status: 201, corpo: publica(tarefa) };
    if (chave) idempotencia.set(chave, resposta);

    if (config.perderProximaResposta) {
      config.perderProximaResposta = false;
      estatisticas.falhasSimuladas += 1;
      return enviar(res, 503, { erro: 'Resposta "perdida" (tarefa foi criada mesmo assim)' });
    }
    return enviar(res, resposta.status, resposta.corpo);
  }

  const atual = id ? tarefas.get(id) : undefined;

  // PUT /tarefas/:id  (controle de concorrência otimista com `versao`)
  if (req.method === 'PUT' && id) {
    if (!atual || atual.excluida) return enviar(res, 404, { erro: 'Tarefa não encontrada' });
    const corpo = await lerCorpo(req);
    if (typeof corpo.versao !== 'number') {
      return enviar(res, 400, { erro: 'Campo "versao" é obrigatório' });
    }
    if (corpo.versao !== atual.versao) {
      estatisticas.conflitos409 += 1;
      return enviar(res, 409, { erro: 'Conflito de versão', atual: publica(atual) });
    }
    if (typeof corpo.titulo === 'string') atual.titulo = corpo.titulo.trim();
    if (typeof corpo.concluida === 'boolean') atual.concluida = corpo.concluida;
    atual.versao += 1;
    atual.atualizadoEm = agora();
    return enviar(res, 200, publica(atual));
  }

  // DELETE /tarefas/:id  (mantém "lápide" para o pull incremental saber da exclusão)
  if (req.method === 'DELETE' && id) {
    if (!atual || atual.excluida) return enviar(res, 404, { erro: 'Tarefa não encontrada' });
    atual.excluida = true;
    atual.versao += 1;
    atual.atualizadoEm = agora();
    return enviar(res, 204);
  }

  return enviar(res, 405, { erro: 'Método não suportado' });
}

async function rotaProdutos(req, res, url) {
  if (req.method !== 'GET') return enviar(res, 405, { erro: 'Método não suportado' });
  if (config.atrasoMs) await esperar(config.atrasoMs);

  const pagina = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
  const limite = Math.min(200, Math.max(1, Number(url.searchParams.get('limite')) || 200));
  const campos = (url.searchParams.get('campos') || '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean);

  const inicio = (pagina - 1) * limite;
  const fatia = produtos.slice(inicio, inicio + limite).map((p) => {
    if (!campos.length) return p;
    return Object.fromEntries(campos.filter((c) => c in p).map((c) => [c, p[c]]));
  });

  const corpo = { itens: fatia, pagina, limite, total: produtos.length, temMais: inicio + limite < produtos.length };
  const texto = JSON.stringify(corpo);
  const etag = `"${crypto.createHash('sha1').update(texto).digest('hex')}"`;

  if (req.headers['if-none-match'] === etag) {
    res.writeHead(304, { ...CORS, ETag: etag, 'Cache-Control': 'no-cache' });
    return res.end();
  }
  return enviar(res, 200, corpo, { ETag: etag, 'Cache-Control': 'no-cache' });
}

const servidor = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const partes = url.pathname.split('/').filter(Boolean);
  const inicio = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - inicio}ms)`);
  });

  try {
    if (req.method === 'OPTIONS') return enviar(res, 204);

    switch (partes[0]) {
      case 'status':
        return enviar(res, 200, { ok: true, horario: new Date().toISOString() });

      case 'lento': {
        const ms = Math.min(60000, Number(url.searchParams.get('ms')) || 8000);
        await esperar(ms);
        return enviar(res, 200, { ok: true, esperou: ms });
      }

      case 'config':
        if (req.method === 'POST') {
          const corpo = await lerCorpo(req);
          if (corpo.falharProximas !== undefined) config.falharProximas = Math.max(0, Number(corpo.falharProximas) || 0);
          if (corpo.perderProximaResposta !== undefined) config.perderProximaResposta = Boolean(corpo.perderProximaResposta);
          if (corpo.taxaFalha !== undefined) config.taxaFalha = Math.min(1, Math.max(0, Number(corpo.taxaFalha) || 0));
          if (corpo.atrasoMs !== undefined) config.atrasoMs = Math.max(0, Number(corpo.atrasoMs) || 0);
        }
        return enviar(res, 200, config);

      case 'tarefas':
        return await rotaTarefas(req, res, url, partes);

      case 'produtos':
        return await rotaProdutos(req, res, url);

      case 'admin':
        if (partes[1] === 'estatisticas') {
          const ativas = [...tarefas.values()].filter((t) => !t.excluida);
          const titulos = new Map();
          for (const t of ativas) titulos.set(t.titulo, (titulos.get(t.titulo) || 0) + 1);
          return enviar(res, 200, {
            ...estatisticas,
            totalTarefas: ativas.length,
            chavesIdempotencia: idempotencia.size,
            titulosDuplicados: [...titulos].filter(([, n]) => n > 1).map(([titulo, n]) => ({ titulo, n })),
          });
        }
        if (partes[1] === 'reset' && req.method === 'POST') {
          tarefas.clear();
          idempotencia.clear();
          Object.keys(estatisticas).forEach((k) => (estatisticas[k] = 0));
          Object.assign(config, { falharProximas: 0, perderProximaResposta: false, taxaFalha: 0, atrasoMs: 0 });
          semear();
          return enviar(res, 200, { ok: true });
        }
        break;
    }
    return enviar(res, 404, { erro: 'Rota não encontrada' });
  } catch (e) {
    return enviar(res, 400, { erro: e instanceof Error ? e.message : String(e) });
  }
});

if (require.main === module) {
  servidor.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando em http://0.0.0.0:${PORT}`);
  });
}

module.exports = { servidor };
