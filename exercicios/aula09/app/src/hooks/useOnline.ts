import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState, useNetInfo } from '@react-native-community/netinfo';

/**
 * Aula 1 - Exercício 2: hook que informa se o aparelho está online.
 *
 * Considera online quando há conexão E a internet é alcançável. Enquanto o
 * NetInfo ainda não sabe se a internet é alcançável (`null`), confia apenas em
 * `isConnected` para não mostrar o banner de offline à toa.
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
  return estado.isConnected === true && estado.isInternetReachable !== false;
}

/** Atalho para o estado completo do NetInfo (tipo, detalhes etc.). */
export { useNetInfo };
