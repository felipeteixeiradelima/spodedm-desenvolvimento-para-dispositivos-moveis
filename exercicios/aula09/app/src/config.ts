/**
 * Endereço do servidor de apoio (pasta ../servidor).
 *
 * Defina EXPO_PUBLIC_API_URL no arquivo .env (veja .env.example) com o IP da
 * sua máquina na rede local, por exemplo: EXPO_PUBLIC_API_URL=http://192.168.0.10:3000
 * No emulador Android, http://10.0.2.2:3000 aponta para o localhost do computador.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/$/, '');

/** Tempo máximo de uma requisição (Aula 1 - exercício 5). */
export const TIMEOUT_PADRAO_MS = 5000;

/** Tamanho da página de produtos (Aula 4 - exercício 3). */
export const ITENS_POR_PAGINA = 20;
