import { API_URL, TIMEOUT_PADRAO_MS } from '../config';

/**
 * Aula 1 - Exercício 5: requisições com timeout (AbortController) e erros
 * classificados para exibir mensagens diferentes ao usuário.
 */
export type TipoErro = 'timeout' | 'nao-encontrado' | 'conflito' | 'http' | 'rede';

export class ErroRequisicao extends Error {
  constructor(
    public tipo: TipoErro,
    mensagem: string,
    public status?: number,
    public corpo?: unknown,
  ) {
    super(mensagem);
    this.name = 'ErroRequisicao';
  }
}

export type OpcoesRequisicao = RequestInit & { timeoutMs?: number };

export function url(caminho: string): string {
  return /^https?:\/\//.test(caminho) ? caminho : `${API_URL}${caminho.startsWith('/') ? '' : '/'}${caminho}`;
}

/**
 * Faz um fetch que é abortado após `timeoutMs` (padrão 5 s).
 * - Resolve com a Response para status 2xx e 304.
 * - Rejeita com ErroRequisicao nos demais casos (timeout, rede, 404, 409, 5xx...).
 */
export async function requisicao(caminho: string, opcoes: OpcoesRequisicao = {}): Promise<Response> {
  const { timeoutMs = TIMEOUT_PADRAO_MS, ...init } = opcoes;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let resposta: Response;
  try {
    resposta = await fetch(url(caminho), {
      ...init,
      headers: { Accept: 'application/json', ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
      signal: controller.signal,
    });
  } catch (e) {
    if (controller.signal.aborted) {
      throw new ErroRequisicao('timeout', `Tempo esgotado: o servidor não respondeu em ${timeoutMs / 1000} s.`);
    }
    throw new ErroRequisicao('rede', 'Sem conexão com a internet ou servidor inacessível.');
  } finally {
    clearTimeout(timer);
  }

  if (resposta.ok || resposta.status === 304) return resposta;

  const corpo = await resposta.json().catch(() => undefined);
  if (resposta.status === 404) {
    throw new ErroRequisicao('nao-encontrado', 'Recurso não encontrado (erro 404).', 404, corpo);
  }
  if (resposta.status === 409) {
    throw new ErroRequisicao('conflito', 'Conflito de versão (erro 409).', 409, corpo);
  }
  throw new ErroRequisicao('http', `Erro do servidor (HTTP ${resposta.status}).`, resposta.status, corpo);
}

/** Atalho para requisições JSON. */
export async function requisicaoJson<T>(caminho: string, opcoes: OpcoesRequisicao = {}): Promise<T> {
  const resposta = await requisicao(caminho, opcoes);
  if (resposta.status === 204) return undefined as T;
  return (await resposta.json()) as T;
}

/** Mensagem amigável para qualquer erro. */
export function mensagemDeErro(e: unknown): string {
  if (e instanceof ErroRequisicao) return e.message;
  return e instanceof Error ? e.message : String(e);
}

// ---------------------------------------------------------------------------
// Aula 2 - Exercício 3: comRetry com backoff exponencial
// ---------------------------------------------------------------------------

export type OpcoesRetry = {
  /** Número máximo de tentativas (incluindo a primeira). */
  tentativas?: number;
  /** Espera base: 500 ms, 1 s, 2 s, 4 s... */
  baseMs?: number;
  /** Espera máxima entre tentativas. */
  maxMs?: number;
  /** Chamado antes de cada nova tentativa (útil para log na tela). */
  aoFalhar?: (info: { tentativa: number; esperaMs: number; erro: unknown }) => void;
};

/** Só vale a pena repetir falhas temporárias: timeout, rede, 429 e 5xx. */
export function deveRepetir(e: unknown): boolean {
  if (!(e instanceof ErroRequisicao)) return false;
  if (e.tipo === 'timeout' || e.tipo === 'rede') return true;
  return e.tipo === 'http' && (e.status === 429 || (e.status ?? 0) >= 500);
}

export const esperar = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function comRetry<T>(fn: () => Promise<T>, opcoes: OpcoesRetry = {}): Promise<T> {
  const { tentativas = 4, baseMs = 500, maxMs = 8000, aoFalhar } = opcoes;
  let ultimoErro: unknown;

  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      return await fn();
    } catch (e) {
      ultimoErro = e;
      if (tentativa === tentativas || !deveRepetir(e)) break;
      // Backoff exponencial + jitter (evita que vários aparelhos repitam juntos)
      const exponencial = Math.min(maxMs, baseMs * 2 ** (tentativa - 1));
      const esperaMs = Math.round(exponencial + Math.random() * exponencial * 0.2);
      aoFalhar?.({ tentativa, esperaMs, erro: e });
      await esperar(esperaMs);
    }
  }
  throw ultimoErro;
}

// ---------------------------------------------------------------------------
// Aula 4 - Exercício 1: medir tamanho e tempo de uma requisição
// ---------------------------------------------------------------------------

export type Medicao<T = unknown> = {
  url: string;
  status: number;
  bytes: number;
  ms: number;
  dados: T | undefined;
  etag: string | null;
};

export async function medirRequisicao<T = unknown>(caminho: string, opcoes: OpcoesRequisicao = {}): Promise<Medicao<T>> {
  const inicio = Date.now();
  const resposta = await requisicao(caminho, opcoes);
  const texto = resposta.status === 304 ? '' : await resposta.text();
  const ms = Date.now() - inicio;
  return {
    url: url(caminho),
    status: resposta.status,
    bytes: tamanhoEmBytes(texto),
    ms,
    dados: texto ? (JSON.parse(texto) as T) : undefined,
    etag: resposta.headers.get('ETag'),
  };
}

export function tamanhoEmBytes(texto: string): number {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(texto).length;
  // Fallback: conta bytes UTF-8 manualmente
  let bytes = 0;
  for (const ch of texto) {
    const c = ch.codePointAt(0) ?? 0;
    bytes += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return bytes;
}

export function formatarBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}
