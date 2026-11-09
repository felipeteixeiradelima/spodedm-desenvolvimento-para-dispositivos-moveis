import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState, useNetInfo } from '@react-native-community/netinfo';
import { obterEstadoConfigServidor } from '../services/configuracaoServidor';

/**
 * Aula 1 - Exercício 2: hook que informa se o aparelho está online.
 *
 * Considera o estado do NetInfo de forma resiliente:
 * - Se `isConnected === false`, o aparelho está desconectado (modo avião ativado ou Wi-Fi desligado).
 * - Se `isConnected === true`:
 *   - Se o modo Servidor Embutido estiver ativo, o app consegue sincronizar localmente no aparelho.
 *   - Em redes universitárias/corporativas, `isInternetReachable` pode ser `false` temporariamente
 *     ou devido a bloqueio de ping do Google (generate_204). Nesses casos, `isConnected === true`
 *     mantém o app funcional.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const atualizar = (estado: NetInfoState) => setOnline(estaOnline(estado));
    NetInfo.fetch().then(atualizar);
    return NetInfo.addEventListener(atualizar);
  }, []);

  return online;
}

export function estaOnline(estado: Pick<NetInfoState, 'isConnected' | 'isInternetReachable'>): boolean {
  // Se não há conexão de rede nenhuma (ex.: modo avião ativado), está offline
  if (estado.isConnected === false) return false;

  const config = obterEstadoConfigServidor();
  if (config.modoEmbutido) return true;

  // Quando conectado, se isInternetReachable for false estrito, verifica se é rede restrita
  // Se isConnected === true e isInternetReachable é null ou true -> online
  return estado.isConnected === true && estado.isInternetReachable !== false;
}

/** Atalho para o estado completo do NetInfo (tipo, detalhes etc.). */
export { useNetInfo };
