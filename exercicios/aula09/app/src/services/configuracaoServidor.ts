import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CHAVE_STORAGE_API = '@aula09:api_url_config';
const CHAVE_STORAGE_MODO_EMBUTIDO = '@aula09:modo_servidor_embutido';

export type EstadoConfigServidor = {
  carregado: boolean;
  modoEmbutido: boolean;
  apiUrl: string;
  conectado: boolean | null; // null = checando
  ultimoPingMs: number | null;
  mensagemStatus: string;
};

// URL inicial
const URL_INICIAL_DEFAULT = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

let estado: EstadoConfigServidor = {
  carregado: false,
  modoEmbutido: false,
  apiUrl: URL_INICIAL_DEFAULT,
  conectado: null,
  ultimoPingMs: null,
  mensagemStatus: 'Inicializando...',
};

const ouvintes = new Set<() => void>();

function definir(parcial: Partial<EstadoConfigServidor>) {
  estado = { ...estado, ...parcial };
  ouvintes.forEach((o) => o());
}

function assinar(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => ouvintes.delete(ouvinte);
}

export function obterEstadoConfigServidor(): EstadoConfigServidor {
  return estado;
}

export function useConfiguracaoServidor(): EstadoConfigServidor {
  return useSyncExternalStore(assinar, obterEstadoConfigServidor, obterEstadoConfigServidor);
}

export async function carregarConfiguracaoServidor(): Promise<void> {
  try {
    const [salvoUrl, salvoEmbutido] = await Promise.all([
      AsyncStorage.getItem(CHAVE_STORAGE_API),
      AsyncStorage.getItem(CHAVE_STORAGE_MODO_EMBUTIDO),
    ]);

    const apiUrl = salvoUrl || URL_INICIAL_DEFAULT;
    // Se estiver em celular real e a URL for localhost (sem túnel ou env),
    // sugere ou ativa por padrão o modo embutido para uma experiência imediata sem quebras
    const ehDispositivoMovel = Platform.OS === 'android' || Platform.OS === 'ios';
    const ehLocalhost = apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1');

    let modoEmbutido = salvoEmbutido !== null ? salvoEmbutido === 'true' : (ehDispositivoMovel && ehLocalhost);

    definir({
      carregado: true,
      apiUrl,
      modoEmbutido,
      mensagemStatus: modoEmbutido
        ? 'Servidor Embutido ativo (sem necessidade de túnel ou rede)'
        : 'Verificando conexão...',
    });

    if (!modoEmbutido) {
      await testarConexaoApi(apiUrl);
    } else {
      definir({ conectado: true, ultimoPingMs: 1 });
    }
  } catch {
    definir({ carregado: true });
  }
}

export async function definirModoEmbutido(ativo: boolean): Promise<void> {
  await AsyncStorage.setItem(CHAVE_STORAGE_MODO_EMBUTIDO, ativo ? 'true' : 'false');
  definir({
    modoEmbutido: ativo,
    conectado: ativo ? true : null,
    mensagemStatus: ativo
      ? 'Servidor Embutido ativo (executando direto no celular)'
      : 'Conectando ao servidor remoto...',
  });
  if (!ativo) {
    await testarConexaoApi(estado.apiUrl);
  }
}

export async function definirUrlServidor(novaUrl: string): Promise<boolean> {
  const urlLimpa = novaUrl.trim().replace(/\/$/, '');
  await AsyncStorage.setItem(CHAVE_STORAGE_API, urlLimpa);
  await AsyncStorage.setItem(CHAVE_STORAGE_MODO_EMBUTIDO, 'false');
  definir({ apiUrl: urlLimpa, modoEmbutido: false });
  return await testarConexaoApi(urlLimpa);
}

export async function testarConexaoApi(urlTeste: string): Promise<boolean> {
  const inicio = Date.now();
  definir({ conectado: null, mensagemStatus: 'Testando conexão...' });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(`${urlTeste}/status`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const ms = Date.now() - inicio;

    if (res.ok) {
      definir({
        conectado: true,
        ultimoPingMs: ms,
        mensagemStatus: `Conectado com sucesso (${ms} ms)`,
      });
      return true;
    } else {
      definir({
        conectado: false,
        ultimoPingMs: ms,
        mensagemStatus: `Servidor respondeu HTTP ${res.status}`,
      });
      return false;
    }
  } catch (e: any) {
    const ehLocalhost = urlTeste.includes('localhost') || urlTeste.includes('127.0.0.1');
    const msg = (Platform.OS !== 'web' && ehLocalhost)
      ? 'No celular físico, localhost aponta para o próprio celular. Use o Servidor Embutido ou configure o túnel/IP da sua máquina.'
      : 'Não foi possível alcançar o servidor na URL informada.';

    definir({
      conectado: false,
      ultimoPingMs: null,
      mensagemStatus: msg,
    });
    return false;
  } finally {
    clearTimeout(timer);
  }
}
