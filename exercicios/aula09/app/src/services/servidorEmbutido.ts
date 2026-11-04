/**
 * Servidor Embutido (In-App Mock Server)
 *
 * Implementa 100% da mesma lógica do `servidor/server.js` diretamente em JavaScript
 * no cliente. Essencial para quando o celular está rodando via Expo em redes restritas
 * (como redes universitárias eduroam, portais cautivos ou 4G/5G com túnel) onde o celular
 * não consegue se comunicar com a porta 3000 do computador de desenvolvimento.
 */

export type TarefaInterna = {
  id: string;
  titulo: string;
  concluida: boolean;
  versao: number;
  atualizadoEm: number;
  excluida: boolean;
};

class ServidorEmbutidoStore {
  private tarefas = new Map<string, TarefaInterna>();
  private idempotencia = new Map<string, { status: number; corpo: unknown }>();
  public estatisticas = {
    postsRecebidos: 0,
    postsRepetidos: 0,
    conflitos409: 0,
    falhasSimuladas: 0,
  };
  public config = {
    falharProximas: 0,
    taxaFalha: 0,
    atrasoMs: 0,
  };
  private relogio = Date.now();

  constructor() {
    this.semear();
  }

  private agora(): number {
    this.relogio = Math.max(this.relogio + 1, Date.now());
    return this.relogio;
  }

  private semear() {
    const titulos = ['Estudar NetInfo', 'Revisar AsyncStorage', 'Implementar retry', 'Ler sobre ETag'];
    for (const titulo of titulos) {
      const id = 'emb-' + Math.random().toString(36).substring(2, 9);
      this.tarefas.set(id, {
        id,
        titulo,
        concluida: false,
        versao: 1,
        atualizadoEm: this.agora(),
        excluida: false,
      });
    }
  }

  private deveFalhar(): boolean {
    if (this.config.falharProximas > 0) {
      this.config.falharProximas -= 1;
      return true;
    }
    return this.config.taxaFalha > 0 && Math.random() < this.config.taxaFalha;
  }

  private publica(t: TarefaInterna) {
    const { excluida, ...resto } = t;
    return resto;
  }

  // Gera 200 produtos para a Aula 4
  private produtos = Array.from({ length: 200 }, (_, i) => {
    const n = i + 1;
    const categorias = ['Eletrônicos', 'Livros', 'Casa', 'Esporte', 'Moda'];
    return {
      id: n,
      nome: `Produto ${String(n).padStart(3, '0')}`,
      preco: Math.round((10 + ((n * 37) % 990) + (n % 100) / 100) * 100) / 100,
      categoria: categorias[n % categorias.length],
      estoque: (n * 13) % 75,
      descricao:
        `Descrição completa do produto ${n}. ` +
        'Este texto longo existe para deixar a resposta maior e mostrar a economia de dados ' +
        'quando o aplicativo pede apenas os campos de que realmente precisa.',
      imagem: `https://picsum.photos/seed/produto${n}/600/400`,
      fabricante: { nome: `Fabricante ${n % 17}`, pais: 'Brasil', site: `https://fabricante${n % 17}.exemplo.com` },
      avaliacoes: [
        { usuario: 'maria', nota: 5, comentario: 'Excelente produto, recomendo a todos.' },
        { usuario: 'joao', nota: 4, comentario: 'Entrega rápida e bom acabamento.' },
      ],
      tags: ['oferta', 'novo', 'popular'].slice(0, (n % 3) + 1),
    };
  });

  public async despachar(
    caminho: string,
    metodo: string,
    corpoRaw?: string,
    headers: Record<string, string> = {},
    signal?: AbortSignal,
  ): Promise<Response> {
    const urlObj = new URL(caminho, 'http://embutido.local');
    const partes = urlObj.pathname.split('/').filter(Boolean);
    const corpo = corpoRaw ? JSON.parse(corpoRaw) : {};

    // Verifica cancelamento
    if (signal?.aborted) {
      throw new DOMException('Requisição abortada pelo timeout', 'AbortError');
    }

    if (this.config.atrasoMs > 0) {
      await new Promise((r) => setTimeout(r, this.config.atrasoMs));
    }

    // /status
    if (partes[0] === 'status') {
      return this.responder(200, { ok: true, modo: 'embutido', horario: new Date().toISOString() });
    }

    // /lento
    if (partes[0] === 'lento') {
      const ms = Number(urlObj.searchParams.get('ms') || 8000);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new DOMException('Requisição abortada pelo timeout', 'AbortError'));
        });
      });
      return this.responder(200, { ok: true, esperou: ms });
    }

    // /config
    if (partes[0] === 'config') {
      if (metodo === 'POST') {
        if (corpo.falharProximas !== undefined) this.config.falharProximas = Number(corpo.falharProximas);
        if (corpo.atrasoMs !== undefined) this.config.atrasoMs = Number(corpo.atrasoMs);
      }
      return this.responder(200, this.config);
    }

    // /admin/estatisticas
    if (partes[0] === 'admin' && partes[1] === 'estatisticas') {
      const ativas = [...this.tarefas.values()].filter((t) => !t.excluida);
      const titulos = new Map<string, number>();
      for (const t of ativas) titulos.set(t.titulo, (titulos.get(t.titulo) || 0) + 1);
      return this.responder(200, {
        ...this.estatisticas,
        totalTarefas: ativas.length,
        chavesIdempotencia: this.idempotencia.size,
        titulosDuplicados: [...titulos].filter(([, n]) => n > 1).map(([titulo, n]) => ({ titulo, n })),
      });
    }

    // /tarefas
    if (partes[0] === 'tarefas') {
      if (this.deveFalhar()) {
        this.estatisticas.falhasSimuladas += 1;
        return this.responder(503, { erro: 'Falha simulada pelo servidor' });
      }

      const id = partes[1];

      // GET /tarefas?since=123
      if (metodo === 'GET' && !id) {
        const since = Number(urlObj.searchParams.get('since') || 0);
        const marcador = this.agora();
        const mudadas = [...this.tarefas.values()].filter((t) => t.atualizadoEm > since);
        return this.responder(200, {
          alteradas: mudadas.filter((t) => !t.excluida).map((t) => this.publica(t)),
          excluidas: since ? mudadas.filter((t) => t.excluida).map((t) => t.id) : [],
          marcador,
        });
      }

      // POST /tarefas
      if (metodo === 'POST' && !id) {
        this.estatisticas.postsRecebidos += 1;
        const chave = headers['idempotency-key'] || headers['Idempotency-Key'];
        if (chave && this.idempotencia.has(chave)) {
          this.estatisticas.postsRepetidos += 1;
          const ant = this.idempotencia.get(chave)!;
          return this.responder(ant.status, ant.corpo, { 'Idempotent-Replay': 'true' });
        }
        const novoId = corpo.id || 'emb-' + Math.random().toString(36).substring(2, 9);
        const tarefa: TarefaInterna = {
          id: novoId,
          titulo: String(corpo.titulo).trim(),
          concluida: Boolean(corpo.concluida),
          versao: 1,
          atualizadoEm: this.agora(),
          excluida: false,
        };
        this.tarefas.set(novoId, tarefa);
        const resposta = { status: 201, corpo: this.publica(tarefa) };
        if (chave) this.idempotencia.set(chave, resposta);
        return this.responder(201, this.publica(tarefa));
      }

      const atual = id ? this.tarefas.get(id) : undefined;

      // PUT /tarefas/:id
      if (metodo === 'PUT' && id) {
        if (!atual || atual.excluida) return this.responder(404, { erro: 'Tarefa não encontrada' });
        if (typeof corpo.versao !== 'number') return this.responder(400, { erro: 'Campo versao é obrigatório' });
        if (corpo.versao !== atual.versao) {
          this.estatisticas.conflitos409 += 1;
          return this.responder(409, { erro: 'Conflito de versão', atual: this.publica(atual) });
        }
        if (typeof corpo.titulo === 'string') atual.titulo = corpo.titulo.trim();
        if (typeof corpo.concluida === 'boolean') atual.concluida = corpo.concluida;
        atual.versao += 1;
        atual.atualizadoEm = this.agora();
        return this.responder(200, this.publica(atual));
      }

      // DELETE /tarefas/:id
      if (metodo === 'DELETE' && id) {
        if (!atual || atual.excluida) return this.responder(404, { erro: 'Tarefa não encontrada' });
        atual.excluida = true;
        atual.versao += 1;
        atual.atualizadoEm = this.agora();
        return this.responder(204, undefined);
      }
    }

    // /produtos
    if (partes[0] === 'produtos' && metodo === 'GET') {
      const pagina = Math.max(1, Number(urlObj.searchParams.get('pagina')) || 1);
      const limite = Math.min(200, Math.max(1, Number(urlObj.searchParams.get('limite')) || 200));
      const campos = (urlObj.searchParams.get('campos') || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);

      const inicio = (pagina - 1) * limite;
      const fatia = this.produtos.slice(inicio, inicio + limite).map((p: any) => {
        if (!campos.length) return p;
        return Object.fromEntries(campos.filter((c) => c in p).map((c) => [c, p[c]]));
      });

      const corpoResp = {
        itens: fatia,
        pagina,
        limite,
        total: this.produtos.length,
        temMais: inicio + limite < this.produtos.length,
      };

      const textoResp = JSON.stringify(corpoResp);
      // Gera hash simples para o ETag
      let hash = 0;
      for (let i = 0; i < textoResp.length; i++) {
        hash = (hash << 5) - hash + textoResp.charCodeAt(i);
        hash |= 0;
      }
      const etag = `"${Math.abs(hash).toString(16)}"`;
      const ifNoneMatch = headers['if-none-match'] || headers['If-None-Match'];

      if (ifNoneMatch === etag) {
        return new Response(null, {
          status: 304,
          headers: { ETag: etag, 'Cache-Control': 'no-cache' },
        });
      }

      return this.responder(200, corpoResp, { ETag: etag });
    }

    return this.responder(404, { erro: 'Rota não encontrada' });
  }

  private responder(status: number, corpo: unknown, extras: Record<string, string> = {}): Response {
    if (status === 204 || corpo === undefined) {
      return new Response(null, { status: 204, headers: extras });
    }
    const texto = JSON.stringify(corpo);
    return new Response(texto, {
      status,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...extras,
      },
    });
  }
}

export const servidorEmbutido = new ServidorEmbutidoStore();
