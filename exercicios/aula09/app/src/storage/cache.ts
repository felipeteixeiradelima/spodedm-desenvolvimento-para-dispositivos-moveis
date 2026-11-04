import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Aula 2 - Exercício 1: salvar e ler dados no AsyncStorage guardando a data e
 * a hora em que foram salvos.
 */
export type EntradaCache<T> = {
  dados: T;
  /** Timestamp (ms) do momento em que os dados foram salvos. */
  salvoEm: number;
};

const PREFIXO = '@aula09:';

export async function salvarCache<T>(chave: string, dados: T): Promise<EntradaCache<T>> {
  const entrada: EntradaCache<T> = { dados, salvoEm: Date.now() };
  await AsyncStorage.setItem(PREFIXO + chave, JSON.stringify(entrada));
  return entrada;
}

export async function lerCache<T>(chave: string): Promise<EntradaCache<T> | null> {
  const texto = await AsyncStorage.getItem(PREFIXO + chave);
  if (!texto) return null;
  try {
    return JSON.parse(texto) as EntradaCache<T>;
  } catch {
    return null;
  }
}

export async function removerCache(chave: string): Promise<void> {
  await AsyncStorage.removeItem(PREFIXO + chave);
}

/** Remove todas as chaves do app (útil para testes). */
export async function limparTudo(): Promise<void> {
  const chaves = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(chaves.filter((c) => c.startsWith(PREFIXO)));
}

export function formatarDataHora(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}
