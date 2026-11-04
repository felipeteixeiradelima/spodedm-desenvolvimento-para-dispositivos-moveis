import { useSyncExternalStore } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { estaOnline } from '../hooks/useOnline';
import { comRetry, ErroRequisicao, mensagemDeErro, requisicaoJson } from '../services/http';
import { lerCache, salvarCache } from '../storage/cache';

/**
 * Módulo de dados offline + sincronização de tarefas.
 *
 * - Aula 2, ex. 2: a lista é carregada primeiro do cache e depois atualizada pela API.
 * - Aula 2, ex. 4: toda alteração feita sem internet vai para uma fila de pendências.
 * - Aula 2, ex. 5: a fila é enviada quando a conexão volta, com Idempotency-Key.
 * - Aula 3, ex. 1: sincronizarPull usa o parâmetro `since` e guarda o marcador.
 * - Aula 3, ex. 2: cada tarefa tem o campo `sincronizado`.
 * - Aula 3, ex. 3: exclusões feitas no servidor são removidas do app no pull.
 * - Aula 3, ex. 4: edições são enviadas com `versao` e o 409 vira um conflito.
 * - Aula 3, ex. 5: resolverConflito permite manter a versão local ou usar a do servidor.
 */

export type Tarefa = {
  id: string;
  titulo: string;
  concluida: boolean;
  /** Versão conhecida do servidor (0 = ainda não existe no servidor). */
  versao: number;
  atualizadoEm: number;
  sincronizado: boolean;
};

type TarefaServidor = Omit<Tarefa, 'sincronizado'>;

export type Operacao = {
  idOp: string;
  tipo: 'criar' | 'editar' | 'excluir';
  tarefaId: string;
  dados?: { titulo?: string; concluida?: boolean };
  /** Mesma chave em todos os reenvios: o servidor não cria a tarefa duas vezes. */
  idempotencyKey: string;
  criadaEm: number;
  tentativas: number;
};

export type Conflito = {
  tarefaId: string;
  local: Tarefa;
  servidor: TarefaServidor;
  detectadoEm: number;
};

export type EstadoTarefas = {
  carregado: boolean;
  tarefas: Tarefa[];
  /** Momento em que o cache local foi salvo pela última vez. */
  salvoEm: number | null;
  /** De onde vieram os dados exibidos agora. */
  origem: 'cache' | 'api' | null;
  fila: Operacao[];
  conflitos: Conflito[];
  marcador: number | null;
  sincronizando: boolean;
  ultimaSync: number | null;
  ultimoErro: string | null;
  log: string[];
};

const CHAVES = {
  tarefas: 'tarefas',
  fila: 'fila-pendencias',
  conflitos: 'conflitos',
  marcador: 'marcador-sync',
};

// ---------------------------------------------------------------------------
// Store simples (useSyncExternalStore)
// ---------------------------------------------------------------------------

let estado: EstadoTarefas = {
  carregado: false,
  tarefas: [],
  salvoEm: null,
  origem: null,
  fila: [],
  conflitos: [],
  marcador: null,
  sincronizando: false,
  ultimaSync: null,
  ultimoErro: null,
  log: [],
};

const ouvintes = new Set<() => void>();

function definir(parcial: Partial<EstadoTarefas>) {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((o) => o());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export const obterEstado = () => estado;

export function useTarefas(): EstadoTarefas {
  return useSyncExternalStore(assinar, obterEstado, obterEstado);
}

function registrar(mensagem: string) {
  const hora = new Date().toLocaleTimeString();
  definir({ log: [`[${hora}] ${mensagem}`, ...estado.log].slice(0, 40) });
}

export function gerarId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// ---------------------------------------------------------------------------
// Persistência
// ---------------------------------------------------------------------------

async function persistir(parcial: Partial<Pick<EstadoTarefas, 'tarefas' | 'fila' | 'conflitos' | 'marcador'>>) {
  const extras: Partial<EstadoTarefas> = {};
  if (parcial.tarefas) {
    const entrada = await salvarCache(CHAVES.tarefas, parcial.tarefas);
    extras.salvoEm = entrada.salvoEm;
  }
  if (parcial.fila) await salvarCache(CHAVES.fila, parcial.fila);
  if (parcial.conflitos) await salvarCache(CHAVES.conflitos, parcial.conflitos);
  if (parcial.marcador !== undefined) await salvarCache(CHAVES.marcador, parcial.marcador);
  definir({ ...parcial, ...extras });
}

/** Lê o cache local. A tela mostra esses dados imediatamente (antes da API). */
export async function carregar(): Promise<void> {
  if (estado.carregado) return;
  const [tarefas, fila, conflitos, marcador] = await Promise.all([
    lerCache<Tarefa[]>(CHAVES.tarefas),
    lerCache<Operacao[]>(CHAVES.fila),
    lerCache<Conflito[]>(CHAVES.conflitos),
    lerCache<number | null>(CHAVES.marcador),
  ]);
  definir({
    carregado: true,
    tarefas: tarefas?.dados ?? [],
    salvoEm: tarefas?.salvoEm ?? null,
    origem: tarefas ? 'cache' : null,
    fila: fila?.dados ?? [],
    conflitos: conflitos?.dados ?? [],
    marcador: marcador?.dados ?? null,
  });
  if (tarefas) registrar(`Cache carregado (${tarefas.dados.length} tarefas).`);
}

/** Apaga cache, fila, conflitos e marcador (útil para testar do zero). */
export async function limparDadosLocais(): Promise<void> {
  await persistir({ tarefas: [], fila: [], conflitos: [], marcador: null });
  definir({ origem: null, ultimaSync: null, ultimoErro: null, log: [] });
}

// ---------------------------------------------------------------------------
// Alterações locais (sempre funcionam, com ou sem internet)
// ---------------------------------------------------------------------------

/** Operação que está sendo enviada agora (não pode mais ser alterada). */
let idOpEmEnvio: string | null = null;

function temPendencias(tarefaId: string, fila = estado.fila, conflitos = estado.conflitos) {
  return fila.some((o) => o.tarefaId === tarefaId) || conflitos.some((c) => c.tarefaId === tarefaId);
}

function novaOperacao(tipo: Operacao['tipo'], tarefaId: string, dados?: Operacao['dados']): Operacao {
  return { idOp: gerarId(), tipo, tarefaId, dados, idempotencyKey: gerarId(), criadaEm: Date.now(), tentativas: 0 };
}

export async function criarTarefa(titulo: string): Promise<void> {
  const texto = titulo.trim();
  if (!texto) return;
  const tarefa: Tarefa = {
    id: gerarId(),
    titulo: texto,
    concluida: false,
    versao: 0,
    atualizadoEm: Date.now(),
    sincronizado: false,
  };
  const op = novaOperacao('criar', tarefa.id, { titulo: tarefa.titulo, concluida: false });
  await persistir({ tarefas: [tarefa, ...estado.tarefas], fila: [...estado.fila, op] });
  registrar(`Tarefa "${texto}" criada localmente e colocada na fila.`);
  void sincronizar();
}

export async function editarTarefa(id: string, dados: { titulo?: string; concluida?: boolean }): Promise<void> {
  const tarefas = estado.tarefas.map((t) => (t.id === id ? { ...t, ...dados, sincronizado: false } : t));
  // Se já existe uma operação pendente (e ainda não enviada) para a tarefa, junta as alterações.
  const pendente = estado.fila.find(
    (o) => o.tarefaId === id && (o.tipo === 'criar' || o.tipo === 'editar') && o.idOp !== idOpEmEnvio,
  );
  const fila = pendente
    ? estado.fila.map((o) => (o === pendente ? { ...o, dados: { ...o.dados, ...dados } } : o))
    : [...estado.fila, novaOperacao('editar', id, dados)];
  await persistir({ tarefas, fila });
  void sincronizar();
}

export async function excluirTarefa(id: string): Promise<void> {
  const tarefas = estado.tarefas.filter((t) => t.id !== id);
  const opsDaTarefa = estado.fila.filter((o) => o.tarefaId === id);
  const criacaoPendente = opsDaTarefa.find((o) => o.tipo === 'criar' && o.idOp !== idOpEmEnvio);
  // Se a tarefa nunca chegou ao servidor basta descartar as operações dela.
  let fila = estado.fila.filter((o) => o.tarefaId !== id || o.idOp === idOpEmEnvio);
  if (!criacaoPendente) fila = [...fila, novaOperacao('excluir', id)];
  const conflitos = estado.conflitos.filter((c) => c.tarefaId !== id);
  await persistir({ tarefas, fila, conflitos });
  void sincronizar();
}

// ---------------------------------------------------------------------------
// Push: envio da fila de pendências
// ---------------------------------------------------------------------------

function aplicarRespostaServidor(remota: TarefaServidor, fila: Operacao[]) {
  const tarefas = estado.tarefas.map((t) => {
    if (t.id !== remota.id) return t;
    const aindaPendente = temPendencias(t.id, fila);
    // Se ainda há alterações locais na fila, mantém os campos locais e atualiza só a versão.
    return aindaPendente
      ? { ...t, versao: remota.versao, atualizadoEm: remota.atualizadoEm, sincronizado: false }
      : { ...remota, sincronizado: true };
  });
  return tarefas;
}

async function enviarOperacao(op: Operacao): Promise<void> {
  const tarefaLocal = estado.tarefas.find((t) => t.id === op.tarefaId);
  const retry = {
    aoFalhar: ({ tentativa, esperaMs, erro }: { tentativa: number; esperaMs: number; erro: unknown }) =>
      registrar(`Falha (${mensagemDeErro(erro)}) na tentativa ${tentativa}. Nova tentativa em ${esperaMs} ms.`),
  };

  if (op.tipo === 'criar') {
    try {
      const criada = await comRetry(
        () =>
          requisicaoJson<TarefaServidor>('/tarefas', {
            method: 'POST',
            headers: { 'Idempotency-Key': op.idempotencyKey },
            body: JSON.stringify({ id: op.tarefaId, ...op.dados }),
          }),
        retry,
      );
      const fila = estado.fila.filter((o) => o.idOp !== op.idOp);
      await persistir({ fila, tarefas: aplicarRespostaServidor(criada, fila) });
      registrar(`Tarefa "${criada.titulo}" enviada (Idempotency-Key ${op.idempotencyKey.slice(0, 8)}…).`);
    } catch (e) {
      // Já existe no servidor (ex.: servidor reiniciou e perdeu as chaves) → considera criada.
      if (e instanceof ErroRequisicao && e.tipo === 'conflito' && e.corpo && typeof e.corpo === 'object') {
        const atual = (e.corpo as { atual: TarefaServidor }).atual;
        const fila = estado.fila.filter((o) => o.idOp !== op.idOp);
        await persistir({ fila, tarefas: aplicarRespostaServidor(atual, fila) });
        return;
      }
      throw e;
    }
    return;
  }

  if (op.tipo === 'editar') {
    if (!tarefaLocal) {
      await persistir({ fila: estado.fila.filter((o) => o.idOp !== op.idOp) });
      return;
    }
    try {
      const editada = await comRetry(
        () =>
          requisicaoJson<TarefaServidor>(`/tarefas/${op.tarefaId}`, {
            method: 'PUT',
            body: JSON.stringify({ ...op.dados, versao: tarefaLocal.versao }),
          }),
        retry,
      );
      const fila = estado.fila.filter((o) => o.idOp !== op.idOp);
      await persistir({ fila, tarefas: aplicarRespostaServidor(editada, fila) });
      registrar(`Edição de "${editada.titulo}" enviada (agora na versão ${editada.versao}).`);
    } catch (e) {
      if (e instanceof ErroRequisicao && e.tipo === 'conflito') {
        // Aula 3 - ex. 4: o servidor tem uma versão mais nova → guarda o conflito para o usuário decidir.
        const servidor = (e.corpo as { atual: TarefaServidor }).atual;
        const conflito: Conflito = { tarefaId: op.tarefaId, local: tarefaLocal, servidor, detectadoEm: Date.now() };
        await persistir({
          fila: estado.fila.filter((o) => o.idOp !== op.idOp),
          conflitos: [...estado.conflitos.filter((c) => c.tarefaId !== op.tarefaId), conflito],
        });
        registrar(`Conflito 409 em "${tarefaLocal.titulo}": local v${tarefaLocal.versao} × servidor v${servidor.versao}.`);
        return;
      }
      if (e instanceof ErroRequisicao && e.tipo === 'nao-encontrado') {
        // A tarefa foi excluída no servidor enquanto editávamos offline.
        await persistir({
          fila: estado.fila.filter((o) => o.tarefaId !== op.tarefaId),
          tarefas: estado.tarefas.filter((t) => t.id !== op.tarefaId),
        });
        registrar(`"${tarefaLocal.titulo}" foi excluída no servidor; edição descartada.`);
        return;
      }
      throw e;
    }
    return;
  }

  // excluir
  try {
    await comRetry(() => requisicaoJson<void>(`/tarefas/${op.tarefaId}`, { method: 'DELETE' }), retry);
  } catch (e) {
    if (!(e instanceof ErroRequisicao && e.tipo === 'nao-encontrado')) throw e;
  }
  await persistir({ fila: estado.fila.filter((o) => o.idOp !== op.idOp) });
  registrar('Exclusão enviada ao servidor.');
}

/** Envia as operações da fila, em ordem. Para na primeira falha temporária. */
export async function processarFila(): Promise<void> {
  while (estado.fila.length) {
    const op = estado.fila[0];
    idOpEmEnvio = op.idOp;
    try {
      await enviarOperacao(op);
    } catch (e) {
      const fila = estado.fila.map((o) => (o.idOp === op.idOp ? { ...o, tentativas: o.tentativas + 1 } : o));
      if (e instanceof ErroRequisicao && e.status !== undefined && e.status < 500 && e.status !== 429) {
        // Erro definitivo (ex.: 400). Não adianta repetir: descarta a operação.
        await persistir({ fila: fila.filter((o) => o.idOp !== op.idOp) });
        registrar(`Operação descartada: ${mensagemDeErro(e)}`);
        continue;
      }
      await persistir({ fila });
      throw e;
    } finally {
      idOpEmEnvio = null;
    }
  }
}

// ---------------------------------------------------------------------------
// Pull incremental (Aula 3 - exercícios 1 e 3)
// ---------------------------------------------------------------------------

type RespostaPull = { alteradas: TarefaServidor[]; excluidas: string[]; marcador: number };

export async function sincronizarPull(): Promise<RespostaPull> {
  const since = estado.marcador ?? 0;
  const resposta = await comRetry(() => requisicaoJson<RespostaPull>(`/tarefas?since=${since}`));

  const excluidas = new Set(resposta.excluidas);
  const recebidas = new Map(resposta.alteradas.map((t) => [t.id, t]));

  // Primeira sincronização: o que estava sincronizado localmente e não veio do servidor é descartado.
  let tarefas = estado.marcador === null ? estado.tarefas.filter((t) => !t.sincronizado || recebidas.has(t.id)) : estado.tarefas;

  // Exclusões feitas no servidor → remove do app (e descarta pendências dela).
  tarefas = tarefas.filter((t) => !excluidas.has(t.id));
  const fila = estado.fila.filter((o) => !excluidas.has(o.tarefaId));
  const conflitos = estado.conflitos.filter((c) => !excluidas.has(c.tarefaId));

  // Alterações: atualiza o que não tem mudanças locais pendentes e adiciona as novas.
  const porId = new Map(tarefas.map((t) => [t.id, t]));
  for (const remota of resposta.alteradas) {
    const local = porId.get(remota.id);
    if (local && temPendencias(local.id, fila, conflitos)) continue;
    porId.set(remota.id, { ...remota, sincronizado: true });
  }
  tarefas = [...porId.values()].sort((a, b) => b.atualizadoEm - a.atualizadoEm);

  await persistir({ tarefas, fila, conflitos, marcador: resposta.marcador });
  definir({ origem: 'api' });
  registrar(
    `Pull since=${since}: ${resposta.alteradas.length} alterada(s), ${resposta.excluidas.length} excluída(s). Novo marcador ${resposta.marcador}.`,
  );
  return resposta;
}

// ---------------------------------------------------------------------------
// Sincronização completa: push da fila + pull
// ---------------------------------------------------------------------------

let sincronizacaoAtual: Promise<void> | null = null;

export function sincronizar(): Promise<void> {
  if (sincronizacaoAtual) return sincronizacaoAtual;
  sincronizacaoAtual = (async () => {
    const rede = await NetInfo.fetch();
    if (!estaOnline(rede)) {
      definir({ ultimoErro: 'Sem conexão: as alterações ficaram na fila.' });
      return;
    }
    definir({ sincronizando: true, ultimoErro: null });
    try {
      await processarFila();
      await sincronizarPull();
      definir({ ultimaSync: Date.now() });
    } catch (e) {
      definir({ ultimoErro: mensagemDeErro(e) });
      registrar(`Sincronização interrompida: ${mensagemDeErro(e)}`);
    } finally {
      definir({ sincronizando: false });
    }
  })().finally(() => {
    sincronizacaoAtual = null;
  });
  return sincronizacaoAtual;
}

// ---------------------------------------------------------------------------
// Conflitos (Aula 3 - exercício 5)
// ---------------------------------------------------------------------------

export async function resolverConflito(tarefaId: string, escolha: 'minha' | 'servidor'): Promise<void> {
  const conflito = estado.conflitos.find((c) => c.tarefaId === tarefaId);
  if (!conflito) return;
  const conflitos = estado.conflitos.filter((c) => c.tarefaId !== tarefaId);

  if (escolha === 'servidor') {
    const tarefas = estado.tarefas.map((t) => (t.id === tarefaId ? { ...conflito.servidor, sincronizado: true } : t));
    await persistir({ tarefas, conflitos });
    registrar(`Conflito resolvido: usando a versão do servidor de "${conflito.servidor.titulo}".`);
    return;
  }

  // Mantém a minha: reenvia os meus dados usando a versão atual do servidor como base.
  const { titulo, concluida } = conflito.local;
  const tarefas = estado.tarefas.map((t) =>
    t.id === tarefaId ? { ...t, titulo, concluida, versao: conflito.servidor.versao, sincronizado: false } : t,
  );
  const fila = [...estado.fila, novaOperacao('editar', tarefaId, { titulo, concluida })];
  await persistir({ tarefas, fila, conflitos });
  registrar(`Conflito resolvido: mantendo a minha versão de "${titulo}".`);
  void sincronizar();
}

// ---------------------------------------------------------------------------
// Simulações "de outro usuário" direto no servidor (para testar 409 e exclusão)
// ---------------------------------------------------------------------------

async function buscarNoServidor(id: string): Promise<TarefaServidor> {
  const { alteradas } = await requisicaoJson<RespostaPull>('/tarefas?since=0');
  const tarefa = alteradas.find((t) => t.id === id);
  if (!tarefa) throw new Error('A tarefa ainda não existe no servidor.');
  return tarefa;
}

export async function editarSomenteNoServidor(id: string): Promise<void> {
  const remota = await buscarNoServidor(id);
  await requisicaoJson(`/tarefas/${id}`, {
    method: 'PUT',
    body: JSON.stringify({ titulo: `${remota.titulo} (editada por outro usuário)`, versao: remota.versao }),
  });
  registrar(`Simulação: "${remota.titulo}" editada direto no servidor (v${remota.versao + 1}).`);
}

export async function excluirSomenteNoServidor(id: string): Promise<void> {
  await requisicaoJson(`/tarefas/${id}`, { method: 'DELETE' });
  registrar('Simulação: tarefa excluída direto no servidor. Sincronize para ver ela sumir do app.');
}

export type EstatisticasServidor = {
  postsRecebidos: number;
  postsRepetidos: number;
  conflitos409: number;
  falhasSimuladas: number;
  totalTarefas: number;
  chavesIdempotencia: number;
  titulosDuplicados: { titulo: string; n: number }[];
};

/** Aula 2 - ex. 5: confere no servidor se alguma tarefa foi duplicada. */
export function buscarEstatisticas(): Promise<EstatisticasServidor> {
  return requisicaoJson<EstatisticasServidor>('/admin/estatisticas');
}
