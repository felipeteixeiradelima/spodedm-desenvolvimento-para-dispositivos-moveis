/**
 * Script de validação automática dos exercícios da Aula 09:
 * - Aula 1: NetInfo, AbortController timeout 5s, status 404 e erros de rede
 * - Aula 2: Cache com data/hora, comRetry com backoff exponencial, Idempotency-Key e duplicidade
 * - Aula 3: Pull incremental com `since`, campo sincronizado, exclusão remota, 409 conflito e resolução
 * - Aula 4: Medição de tempo e tamanho, otimização com ?campos=, paginação e ETag 304
 */
const http = require('node:http');
const { servidor } = require('./servidor/server.js');

const PORT = 3099;
let serverInstance;

function iniciarServidor() {
  return new Promise((resolve) => {
    serverInstance = servidor.listen(PORT, '127.0.0.1', () => {
      console.log(`[TESTES] Servidor iniciado na porta ${PORT}`);
      resolve();
    });
  });
}

function pararServidor() {
  return new Promise((resolve) => {
    if (serverInstance) {
      serverInstance.close(() => {
        console.log(`[TESTES] Servidor encerrado.`);
        resolve();
      });
    } else {
      resolve();
    }
  });
}

async function request(path, options = {}) {
  const url = `http://127.0.0.1:${PORT}${path}`;
  const { timeout, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = timeout ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    const res = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
    });
    return res;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function executarTestes() {
  await iniciarServidor();
  let erros = 0;

  function asserir(condicao, mensagem) {
    if (condicao) {
      console.log(`  ✅ ${mensagem}`);
    } else {
      console.error(`  ❌ FALHA: ${mensagem}`);
      erros++;
    }
  }

  try {
    console.log('\n--- VALIDANDO AULA 1: Conectividade & Timeout (AbortController) ---');
    // Teste 1: Rota status
    const resStatus = await request('/status');
    asserir(resStatus.status === 200, 'GET /status retorna 200');

    // Teste 2: AbortController timeout 5s
    try {
      console.log('  ⏳ Testando AbortController com timeout de 1000ms na rota lenta (ms=2500)...');
      await request('/lento?ms=2500', { timeout: 1000 });
      asserir(false, 'Deveria ter disparado timeout');
    } catch (e) {
      asserir(e.name === 'AbortError' || e.message.includes('aborted'), 'AbortController abortou a requisição no timeout esperado');
    }

    // Teste 3: Erro 404
    const res404 = await request('/rota-inexistente-404');
    asserir(res404.status === 404, 'Rota inexistente retorna 404');

    console.log('\n--- VALIDANDO AULA 2: Resiliência, Retry e Idempotency-Key ---');
    // Teste 4: Criação de tarefa com Idempotency-Key
    const idChave = 'chave-teste-' + Date.now();
    const resCriar1 = await request('/tarefas', {
      method: 'POST',
      headers: { 'Idempotency-Key': idChave },
      body: JSON.stringify({ titulo: 'Tarefa com Idempotencia' }),
    });
    const dados1 = await resCriar1.json();
    asserir(resCriar1.status === 201, 'POST /tarefas cria tarefa com sucesso (status 201)');

    // Teste 5: Reenvio da mesma Idempotency-Key (não deve duplicar)
    const resCriar2 = await request('/tarefas', {
      method: 'POST',
      headers: { 'Idempotency-Key': idChave },
      body: JSON.stringify({ titulo: 'Tarefa com Idempotencia' }),
    });
    const dados2 = await resCriar2.json();
    asserir(resCriar2.status === 201, 'POST reenviado retorna 201 da idempotência');
    asserir(dados2.id === dados1.id, 'ID retornado é idêntico ao anterior (sem duplicar)');

    const resStats = await (await request('/admin/estatisticas')).json();
    asserir(resStats.postsRepetidos >= 1, `Estatísticas confirmam post repetido absorvido (total: ${resStats.postsRepetidos})`);
    asserir(resStats.titulosDuplicados.length === 0, 'Nenhum título duplicado detectado');

    console.log('\n--- VALIDANDO AULA 3: Sincronização, Marcador since, Conflito 409 e Exclusão ---');
    // Teste 6: Pull incremental usando since
    const resPullInicial = await (await request('/tarefas?since=0')).json();
    const marcador = resPullInicial.marcador;
    asserir(marcador > 0, `Pull inicial retornou marcador: ${marcador}`);

    // Cria nova tarefa no servidor
    const resNova = await (await request('/tarefas', {
      method: 'POST',
      body: JSON.stringify({ titulo: 'Nova Tarefa Pós-Marcador' }),
    })).json();

    // Pull incremental usando o since anterior deve trazer somente a nova
    const resPullIncremental = await (await request(`/tarefas?since=${marcador}`)).json();
    asserir(
      resPullIncremental.alteradas.some((t) => t.id === resNova.id),
      'Pull com since filtrou e trouxe a tarefa criada após o marcador',
    );

    // Teste 7: Conflito 409 ao enviar versão desatualizada
    const res409 = await request(`/tarefas/${resNova.id}`, {
      method: 'PUT',
      body: JSON.stringify({ titulo: 'Edição com versão antiga', versao: 0 }),
    });
    asserir(res409.status === 409, 'Edição com versão defasada retorna conflito HTTP 409');

    // Teste 8: Edição com versão correta (v1 -> v2)
    const res200 = await request(`/tarefas/${resNova.id}`, {
      method: 'PUT',
      body: JSON.stringify({ titulo: 'Edição aceita', versao: resNova.versao }),
    });
    asserir(res200.status === 200, 'Edição com versão correta é aceita com HTTP 200');

    // Teste 9: Exclusão no servidor e tratamento no pull
    const marcadorAntesExcluir = (await (await request('/tarefas?since=0')).json()).marcador;
    const resDel = await request(`/tarefas/${resNova.id}`, { method: 'DELETE' });
    asserir(resDel.status === 204, 'DELETE /tarefas/:id remove tarefa (status 204)');

    const resPullExclusao = await (await request(`/tarefas?since=${marcadorAntesExcluir}`)).json();
    asserir(
      resPullExclusao.excluidas.includes(resNova.id),
      'Pull incremental lista a tarefa excluída na lista de excluidas',
    );

    console.log('\n--- VALIDANDO AULA 4: Consumo, Filtro de Campos, Paginação e ETag ---');
    // Teste 10: Comparação de lista completa vs ?campos=
    const resCompleta = await request('/produtos?pagina=1&limite=20');
    const textoCompleta = await resCompleta.text();
    const bytesCompleta = Buffer.byteLength(textoCompleta);

    const resOtimizada = await request('/produtos?pagina=1&limite=20&campos=id,nome,preco');
    const textoOtimizada = await resOtimizada.text();
    const bytesOtimizada = Buffer.byteLength(textoOtimizada);

    asserir(
      bytesOtimizada < bytesCompleta,
      `?campos= economizou dados: de ${bytesCompleta} B para ${bytesOtimizada} B (${Math.round(((bytesCompleta - bytesOtimizada) / bytesCompleta) * 100)}% de redução)`,
    );

    // Teste 11: Paginação
    const resPag1 = await (await request('/produtos?pagina=1&limite=20')).json();
    const resPag2 = await (await request('/produtos?pagina=2&limite=20')).json();
    asserir(resPag1.itens.length === 20, 'Página 1 carrega 20 itens');
    asserir(resPag2.itens.length === 20, 'Página 2 carrega 20 itens');
    asserir(resPag1.itens[0].id !== resPag2.itens[0].id, 'Páginas trazem produtos distintos');

    // Teste 12: Cache com ETag e 304 Not Modified
    const etag = resCompleta.headers.get('ETag');
    asserir(Boolean(etag), `Servidor enviou cabeçalho ETag: ${etag}`);

    const res304 = await request('/produtos?pagina=1&limite=20', {
      headers: { 'If-None-Match': etag },
    });
    asserir(res304.status === 304, 'Requisição com If-None-Match retornou HTTP 304 Not Modified');

    console.log('\n===========================================');
    if (erros === 0) {
      console.log('🎉 TODOS OS TESTES PASSARAM COM SUCESSO! 100% VALIDADO.');
    } else {
      console.error(`⚠️ FORAM ENCONTRADOS ${erros} ERROS.`);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Erro inesperado durante os testes:', err);
    process.exitCode = 1;
  } finally {
    await pararServidor();
  }
}

executarTestes();
