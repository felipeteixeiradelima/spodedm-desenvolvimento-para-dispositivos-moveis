import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import {
  buscarProdutosComETag,
  buscarProdutosPaginados,
  ComparacaoConsumo,
  compararConsumoCampos,
  definirPreferenciaApenasWifi,
  limparCacheETag,
  obterPreferenciaApenasWifi,
  Produto,
  ResultadoETag,
} from '../services/produtos';

export function Aula4Screen() {
  const netInfo = useNetInfo();

  // Opção Baixar apenas no Wi-Fi (Aula 4 - Ex 5)
  const [apenasWifi, setApenasWifi] = useState(false);

  // Lista Paginada (Aula 4 - Ex 3)
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [pagina, setPagina] = useState(1);
  const [temMais, setTemMais] = useState(true);
  const [carregandoLista, setCarregandoLista] = useState(false);
  const [erroLista, setErroLista] = useState<string | null>(null);

  // Comparação de Consumo ?campos= (Aula 4 - Ex 1 e 2)
  const [comparacao, setComparacao] = useState<ComparacaoConsumo | null>(null);
  const [comparando, setComparando] = useState(false);

  // Cache com ETag 304 (Aula 4 - Ex 4)
  const [resultadoETag, setResultadoETag] = useState<ResultadoETag | null>(null);
  const [carregandoETag, setCarregandoETag] = useState(false);

  useEffect(() => {
    obterPreferenciaApenasWifi().then((val) => {
      setApenasWifi(val);
      // Carrega primeira página
      void carregarMais(1, val);
    });
  }, []);

  async function alternarWifi(novoValor: boolean) {
    setApenasWifi(novoValor);
    await definirPreferenciaApenasWifi(novoValor);
  }

  async function carregarMais(proxPagina = pagina, restricaoWifi = apenasWifi) {
    if (carregandoLista || (!temMais && proxPagina !== 1)) return;
    setCarregandoLista(true);
    setErroLista(null);

    try {
      const resp = await buscarProdutosPaginados(proxPagina, restricaoWifi);
      if (proxPagina === 1) {
        setProdutos(resp.itens);
      } else {
        setProdutos((prev) => [...prev, ...resp.itens]);
      }
      setPagina(proxPagina + 1);
      setTemMais(resp.temMais);
    } catch (e: any) {
      setErroLista(e.message);
    } finally {
      setCarregandoLista(false);
    }
  }

  function reiniciarLista() {
    setPagina(1);
    setTemMais(true);
    void carregarMais(1, apenasWifi);
  }

  async function handleComparar() {
    setComparando(true);
    try {
      const res = await compararConsumoCampos();
      setComparacao(res);
    } catch (e: any) {
      Alert.alert('Erro ao comparar', e.message);
    } finally {
      setComparando(false);
    }
  }

  async function handleTestarETag() {
    setCarregandoETag(true);
    try {
      const res = await buscarProdutosComETag();
      setResultadoETag(res);
    } catch (e: any) {
      Alert.alert('Erro ao testar ETag', e.message);
    } finally {
      setCarregandoETag(false);
    }
  }

  async function handleResetarETag() {
    await limparCacheETag();
    setResultadoETag(null);
    Alert.alert('Cache ETag resetado', 'A próxima requisição retornará 200 OK com novo cabeçalho ETag.');
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={produtos}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => (
        <View style={styles.itemProduto}>
          <View style={styles.topoProduto}>
            <Text style={styles.nomeProduto}>{item.nome}</Text>
            {item.preco !== undefined && (
              <Text style={styles.precoProduto}>R$ {item.preco.toFixed(2)}</Text>
            )}
          </View>
          {item.categoria && <Text style={styles.categoriaProduto}>{item.categoria}</Text>}
          {item.descricao && (
            <Text numberOfLines={2} style={styles.descProduto}>
              {item.descricao}
            </Text>
          )}
        </View>
      )}
      onEndReached={() => {
        if (!carregandoLista && temMais) {
          void carregarMais(pagina, apenasWifi);
        }
      }}
      onEndReachedThreshold={0.4}
      ListHeaderComponent={
        <View>
          <Text style={styles.titulo}>Aula 4 - Otimização no Consumo de Dados</Text>

          {/* Card: Opção Baixar Apenas no Wi-Fi (NetInfo) */}
          <View style={styles.card}>
            <View style={styles.linhaWifi}>
              <View style={styles.textoWifiContainer}>
                <Text style={styles.subtitulo}>Baixar apenas no Wi-Fi</Text>
                <Text style={styles.descWifi}>
                  Rede atual: <Text style={styles.negrito}>{netInfo.type}</Text>
                  {netInfo.type !== 'wifi' && apenasWifi
                    ? ' (Downloads de dados bloqueados)'
                    : ' (Downloads permitidos)'}
                </Text>
              </View>
              <Switch
                value={apenasWifi}
                onValueChange={alternarWifi}
                trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                thumbColor={apenasWifi ? '#0284c7' : '#f1f5f9'}
              />
            </View>
          </View>

          {/* Card: Comparação ?campos= vs Completa */}
          <View style={styles.card}>
            <Text style={styles.subtitulo}>1 & 2. Comparação de Consumo e Tempo</Text>
            <Text style={styles.instrucao}>
              Mede tamanho em bytes e tempo da requisição completa vs usando filtro ?campos=id,nome,preco.
            </Text>

            <TouchableOpacity
              style={[styles.botao, styles.botaoAzul]}
              onPress={handleComparar}
              disabled={comparando}
            >
              {comparando ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.textoBotao}>Comparar Lista Completa vs ?campos=</Text>
              )}
            </TouchableOpacity>

            {comparacao && (
              <View style={styles.caixaComparacao}>
                <View style={styles.linhaTabela}>
                  <Text style={styles.colHeader}>Métrica</Text>
                  <Text style={styles.colHeader}>Completa</Text>
                  <Text style={styles.colHeader}>?campos=</Text>
                </View>
                <View style={styles.linhaTabela}>
                  <Text style={styles.colLabel}>Tamanho</Text>
                  <Text style={styles.colValor}>{comparacao.completa.formatado}</Text>
                  <Text style={[styles.colValor, styles.textoVerde]}>{comparacao.otimizada.formatado}</Text>
                </View>
                <View style={styles.linhaTabela}>
                  <Text style={styles.colLabel}>Tempo</Text>
                  <Text style={styles.colValor}>{comparacao.completa.ms} ms</Text>
                  <Text style={[styles.colValor, styles.textoVerde]}>{comparacao.otimizada.ms} ms</Text>
                </View>

                <View style={styles.destaqueEconomia}>
                  <Text style={styles.textoDestaque}>
                    🎉 Economia de dados: <Text style={styles.negrito}>{comparacao.economiaPorcentagem}%</Text> ({comparacao.completa.bytes - comparacao.otimizada.bytes} bytes a menos por requisição).
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Card: Cache com ETag (304 Not Modified) */}
          <View style={styles.card}>
            <Text style={styles.subtitulo}>4. Cache HTTP com ETag (304 Not Modified)</Text>
            <Text style={styles.instrucao}>
              Clique para fazer a 1ª requisição (200 OK + ETag). Ao clicar novamente, o app envia If-None-Match e o servidor retorna 304 com 0 bytes de dados!
            </Text>

            <View style={styles.botoesLinha}>
              <TouchableOpacity
                style={[styles.botao, styles.botaoVerde, { flex: 1 }]}
                onPress={handleTestarETag}
                disabled={carregandoETag}
              >
                {carregandoETag ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.textoBotao}>Testar Requisição com ETag</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botao, styles.botaoCinza]}
                onPress={handleResetarETag}
              >
                <Text style={styles.textoBotao}>Resetar ETag</Text>
              </TouchableOpacity>
            </View>

            {resultadoETag && (
              <View
                style={[
                  styles.caixaResultadoETag,
                  resultadoETag.foi304 ? styles.caixa304 : styles.caixa200,
                ]}
              >
                <Text style={styles.tituloETag}>
                  {resultadoETag.foi304 ? '⚡ HTTP 304 Not Modified' : '📥 HTTP 200 OK'}
                </Text>
                <Text style={styles.detalheETag}>{resultadoETag.mensagem}</Text>
                <Text style={styles.infoETag}>
                  ETag: {resultadoETag.etagRecebido || 'N/A'}
                </Text>
                <Text style={styles.infoETag}>
                  Bytes trafegados no corpo: {resultadoETag.bytesTransferidos} B
                </Text>
              </View>
            )}
          </View>

          {/* Seção da Lista Paginada (FlatList) */}
          <View style={styles.headerLista}>
            <Text style={styles.subtitulo}>3. Lista Paginada ({produtos.length} itens)</Text>
            <TouchableOpacity onPress={reiniciarLista}>
              <Text style={styles.linkRecarregar}>Recarregar</Text>
            </TouchableOpacity>
          </View>

          {erroLista && (
            <View style={styles.alertaErro}>
              <Text style={styles.textoErro}>{erroLista}</Text>
            </View>
          )}
        </View>
      }
      ListFooterComponent={
        carregandoLista ? (
          <View style={styles.carregandoFooter}>
            <ActivityIndicator color="#0284c7" size="small" />
            <Text style={styles.textoCarregando}>Carregando mais 20 produtos...</Text>
          </View>
        ) : !temMais ? (
          <Text style={styles.fimLista}>Fim da lista de produtos.</Text>
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  titulo: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  subtitulo: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 6 },
  instrucao: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  linhaWifi: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textoWifiContainer: { flex: 1, marginRight: 12 },
  descWifi: { fontSize: 13, color: '#64748b' },
  negrito: { fontWeight: '700', color: '#0f172a' },
  botao: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  botaoAzul: { backgroundColor: '#0284c7' },
  botaoVerde: { backgroundColor: '#16a34a' },
  botaoCinza: { backgroundColor: '#64748b' },
  textoBotao: { color: '#fff', fontSize: 13, fontWeight: '600' },
  botoesLinha: { flexDirection: 'row', gap: 8 },
  caixaComparacao: { marginTop: 12, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, overflow: 'hidden' },
  linhaTabela: { flexDirection: 'row', paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  colHeader: { flex: 1, fontWeight: '700', fontSize: 12, color: '#475569' },
  colLabel: { flex: 1, fontSize: 13, color: '#64748b' },
  colValor: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0f172a' },
  textoVerde: { color: '#16a34a' },
  destaqueEconomia: { backgroundColor: '#f0fdf4', padding: 10 },
  textoDestaque: { fontSize: 13, color: '#15803d' },
  caixaResultadoETag: { marginTop: 12, padding: 12, borderRadius: 8, borderWidth: 1 },
  caixa304: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  caixa200: { backgroundColor: '#eff6ff', borderColor: '#93c5fd' },
  tituloETag: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  detalheETag: { fontSize: 13, color: '#334155', marginBottom: 6 },
  infoETag: { fontSize: 11, fontFamily: 'monospace', color: '#64748b' },
  headerLista: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, marginBottom: 8 },
  linkRecarregar: { color: '#0284c7', fontWeight: '600', fontSize: 13 },
  alertaErro: { backgroundColor: '#fee2e2', padding: 10, borderRadius: 8, marginBottom: 12 },
  textoErro: { color: '#991b1b', fontSize: 13 },
  itemProduto: {
    backgroundColor: '#ffffff',
    padding: 14,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  topoProduto: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  nomeProduto: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  precoProduto: { fontSize: 14, fontWeight: '700', color: '#0284c7' },
  categoriaProduto: { fontSize: 11, color: '#64748b', marginTop: 2 },
  descProduto: { fontSize: 12, color: '#475569', marginTop: 6 },
  carregandoFooter: { paddingVertical: 16, alignItems: 'center', gap: 6 },
  textoCarregando: { fontSize: 12, color: '#64748b' },
  fimLista: { textAlign: 'center', paddingVertical: 16, color: '#94a3b8', fontSize: 12 },
});
