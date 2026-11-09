import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { ITENS_POR_PAGINA } from '../config';
import { ErroRequisicao, formatarBytes, medirRequisicao, requisicao, requisicaoJson, url } from './http';

export type Produto = {
  id: number;
  nome: string;
  preco?: number;
  categoria?: string;
  estoque?: number;
  descricao?: string;
  imagem?: string;
  fabricante?: { nome: string; pais: string; site: string };
  avaliacoes?: Array<{ usuario: string; nota: number; comentario: string }>;
  tags?: string[];
};

export type RespostaProdutos = {
  itens: Produto[];
  pagina: number;
  limite: number;
  total: number;
  temMais: boolean;
};

const CHAVE_APENAS_WIFI = '@aula09:apenas_wifi';
const CHAVE_ETAG_PRODUTOS = '@aula09:etag_produtos';
const CHAVE_CACHE_PRODUTOS_ETAG = '@aula09:dados_produtos_etag';

/**
 * Aula 4 - Exercício 5: opção "baixar apenas no Wi-Fi" usando NetInfo.
 */
export async function obterPreferenciaApenasWifi(): Promise<boolean> {
  const valor = await AsyncStorage.getItem(CHAVE_APENAS_WIFI);
  return valor === 'true';
}

export async function definirPreferenciaApenasWifi(ativo: boolean): Promise<void> {
  await AsyncStorage.setItem(CHAVE_APENAS_WIFI, ativo ? 'true' : 'false');
}

export async function verificarPermissaoDownloadWifi(apenasWifi: boolean): Promise<{ permitido: boolean; motivo?: string; tipoRede: string }> {
  const rede = await NetInfo.fetch();
  const tipoRede = rede.type;

  if (apenasWifi && tipoRede !== 'wifi') {
    return {
      permitido: false,
      motivo: `Download bloqueado: opção "baixar apenas no Wi-Fi" está ativada e a conexão atual é "${tipoRede}".`,
      tipoRede,
    };
  }
  return { permitido: true, tipoRede };
}

/**
 * Aula 4 - Exercício 3: carregar produtos paginados de 20 em 20 com verificação de Wi-Fi.
 */
export async function buscarProdutosPaginados(pagina: number = 1, apenasWifi: boolean = false): Promise<RespostaProdutos> {
  const permissao = await verificarPermissaoDownloadWifi(apenasWifi);
  if (!permissao.permitido) {
    throw new ErroRequisicao('rede', permissao.motivo || 'Download restrito ao Wi-Fi');
  }

  return requisicaoJson<RespostaProdutos>(`/produtos?pagina=${pagina}&limite=${ITENS_POR_PAGINA}`);
}

/**
 * Aula 4 - Exercício 2: compara a lista completa com a lista usando ?campos=id,nome,preco
 */
export type ComparacaoConsumo = {
  completa: { bytes: number; ms: number; totalItens: number; formatado: string };
  otimizada: { bytes: number; ms: number; totalItens: number; formatado: string };
  economiaBytes: number;
  economiaPorcentagem: number;
  tempoSalvoMs: number;
};

export async function compararConsumoCampos(): Promise<ComparacaoConsumo> {
  // 1. Requisição completa (todos os campos pesados)
  const medicaoCompleta = await medirRequisicao<RespostaProdutos>('/produtos?pagina=1&limite=20');

  // 2. Requisição enxuta apenas com os campos necessários
  const medicaoOtimizada = await medirRequisicao<RespostaProdutos>('/produtos?pagina=1&limite=20&campos=id,nome,preco');

  const economiaBytes = Math.max(0, medicaoCompleta.bytes - medicaoOtimizada.bytes);
  const economiaPorcentagem = medicaoCompleta.bytes > 0
    ? Math.round((economiaBytes / medicaoCompleta.bytes) * 100)
    : 0;

  return {
    completa: {
      bytes: medicaoCompleta.bytes,
      ms: medicaoCompleta.ms,
      totalItens: medicaoCompleta.dados?.itens.length || 0,
      formatado: formatarBytes(medicaoCompleta.bytes),
    },
    otimizada: {
      bytes: medicaoOtimizada.bytes,
      ms: medicaoOtimizada.ms,
      totalItens: medicaoOtimizada.dados?.itens.length || 0,
      formatado: formatarBytes(medicaoOtimizada.bytes),
    },
    economiaBytes,
    economiaPorcentagem,
    tempoSalvoMs: medicaoCompleta.ms - medicaoOtimizada.ms,
  };
}

/**
 * Aula 4 - Exercício 4: cache com ETag e verificação de retorno 304 Not Modified.
 */
export type ResultadoETag = {
  status: number;
  foi304: boolean;
  etagRecebido: string | null;
  etagEnviado: string | null;
  bytesTransferidos: number;
  dados: RespostaProdutos;
  mensagem: string;
};

export async function buscarProdutosComETag(): Promise<ResultadoETag> {
  const etagSalvo = await AsyncStorage.getItem(CHAVE_ETAG_PRODUTOS);
  const headers: Record<string, string> = {};
  if (etagSalvo) {
    headers['If-None-Match'] = etagSalvo;
  }

  const resposta = await requisicao('/produtos?pagina=1&limite=20', { headers });

  if (resposta.status === 304) {
    // Retornou 304! Não transferiu o corpo da resposta
    const cacheSalvo = await AsyncStorage.getItem(CHAVE_CACHE_PRODUTOS_ETAG);
    const dados = cacheSalvo ? JSON.parse(cacheSalvo) : { itens: [], total: 0 };
    return {
      status: 304,
      foi304: true,
      etagRecebido: resposta.headers.get('ETag') || etagSalvo,
      etagEnviado: etagSalvo,
      bytesTransferidos: 0,
      dados,
      mensagem: 'Status 304 Not Modified! Dados reaproveitados do cache local sem retransmissão de dados.',
    };
  }

  const texto = await resposta.text();
  const etagNovo = resposta.headers.get('ETag');
  if (etagNovo) {
    await AsyncStorage.setItem(CHAVE_ETAG_PRODUTOS, etagNovo);
    await AsyncStorage.setItem(CHAVE_CACHE_PRODUTOS_ETAG, texto);
  }

  const dados = JSON.parse(texto) as RespostaProdutos;
  return {
    status: resposta.status,
    foi304: false,
    etagRecebido: etagNovo,
    etagEnviado: etagSalvo,
    bytesTransferidos: new TextEncoder().encode(texto).length,
    dados,
    mensagem: `Status ${resposta.status} OK com novo ETag gerado (${etagNovo?.slice(0, 10)}...).`,
  };
}

export async function limparCacheETag(): Promise<void> {
  await AsyncStorage.removeItem(CHAVE_ETAG_PRODUTOS);
  await AsyncStorage.removeItem(CHAVE_CACHE_PRODUTOS_ETAG);
}
