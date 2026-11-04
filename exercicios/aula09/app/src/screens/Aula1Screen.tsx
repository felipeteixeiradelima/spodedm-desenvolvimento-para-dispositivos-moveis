import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useOnline } from '../hooks/useOnline';
import { ErroRequisicao, mensagemDeErro, requisicao } from '../services/http';

export function Aula1Screen() {
  const netInfo = useNetInfo();
  const online = useOnline();

  const [carregando, setCarregando] = useState(false);
  const [resultadoTeste, setResultadoTeste] = useState<{
    tipo: 'sucesso' | 'timeout' | '404' | 'rede' | null;
    mensagem: string;
    detalhes?: string;
  } | null>(null);

  async function testarRequisicao(tipoTeste: 'timeout' | '404' | 'rede' | 'normal') {
    setCarregando(true);
    setResultadoTeste(null);

    try {
      if (tipoTeste === 'timeout') {
        // Rota que demora 7 segundos, com timeout de 5s configurado via AbortController
        await requisicao('/lento?ms=7000', { timeoutMs: 5000 });
        setResultadoTeste({
          tipo: 'sucesso',
          mensagem: 'Requisição concluída.',
        });
      } else if (tipoTeste === '404') {
        // Rota inexistente para simular 404
        await requisicao('/rota-nao-existente-404-exemplo', { timeoutMs: 5000 });
        setResultadoTeste({
          tipo: 'sucesso',
          mensagem: 'Requisição concluída.',
        });
      } else if (tipoTeste === 'rede') {
        // Host inválido/inacessível para simular falta de conexão/rede
        await requisicao('http://192.0.2.1:9999/sem-rede', { timeoutMs: 3000 });
        setResultadoTeste({
          tipo: 'sucesso',
          mensagem: 'Requisição concluída.',
        });
      } else {
        // Normal
        const resp = await requisicao('/status', { timeoutMs: 5000 });
        const dados = await resp.json();
        setResultadoTeste({
          tipo: 'sucesso',
          mensagem: `Sucesso! Servidor respondeu em tempo hábil: ${JSON.stringify(dados)}`,
        });
      }
    } catch (e) {
      if (e instanceof ErroRequisicao) {
        if (e.tipo === 'timeout') {
          setResultadoTeste({
            tipo: 'timeout',
            mensagem: '⏱️ Tempo de requisição esgotado (Timeout de 5 segundos)!',
            detalhes: 'O AbortController cancelou a requisição porque o servidor excedeu o limite de 5s.',
          });
        } else if (e.tipo === 'nao-encontrado' || e.status === 404) {
          setResultadoTeste({
            tipo: '404',
            mensagem: '🔍 Recurso Não Encontrado (Erro HTTP 404)!',
            detalhes: 'A rota solicitada não existe no servidor.',
          });
        } else if (e.tipo === 'rede') {
          setResultadoTeste({
            tipo: 'rede',
            mensagem: '📡 Falha de Rede ou Sem Conexão!',
            detalhes: 'Não foi possível alcançar o servidor ou o aparelho está sem acesso à internet.',
          });
        } else {
          setResultadoTeste({
            tipo: 'rede',
            mensagem: `Erro na requisição: ${e.message}`,
            detalhes: `Status: ${e.status || 'N/A'}`,
          });
        }
      } else {
        setResultadoTeste({
          tipo: 'rede',
          mensagem: `Erro inesperado: ${mensagemDeErro(e)}`,
        });
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.titulo}>Aula 1 - Conectividade Não Persistente</Text>

      {/* Card 1: Informações de Conexão com NetInfo */}
      <View style={styles.card}>
        <Text style={styles.subtitulo}>1. Estado da Conexão (NetInfo)</Text>
        <Text style={styles.instrucao}>
          Ligue ou desligue o Modo Avião para ver a atualização em tempo real:
        </Text>

        <View style={styles.linhaInfo}>
          <Text style={styles.label}>Hook useOnline():</Text>
          <Text style={[styles.valorBadge, online ? styles.badgeVerde : styles.badgeVermelho]}>
            {online ? 'ONLINE' : 'OFFLINE'}
          </Text>
        </View>

        <View style={styles.linhaInfo}>
          <Text style={styles.label}>type (tipo da rede):</Text>
          <Text style={styles.valor}>{netInfo.type || 'Desconhecido'}</Text>
        </View>

        <View style={styles.linhaInfo}>
          <Text style={styles.label}>isConnected:</Text>
          <Text style={[styles.valor, netInfo.isConnected ? styles.textoVerde : styles.textoVermelho]}>
            {String(netInfo.isConnected)}
          </Text>
        </View>

        <View style={styles.linhaInfo}>
          <Text style={styles.label}>isInternetReachable:</Text>
          <Text style={[styles.valor, netInfo.isInternetReachable ? styles.textoVerde : styles.textoVermelho]}>
            {String(netInfo.isInternetReachable)}
          </Text>
        </View>
      </View>

      {/* Card 2: Requisição com Timeout de 5s e Mensagens Diferenciadas */}
      <View style={styles.card}>
        <Text style={styles.subtitulo}>2. Timeout 5s (AbortController) e Tratamento</Text>
        <Text style={styles.instrucao}>
          Teste os cenários exigidos: Timeout de 5 segundos, Erro 404 e Falta de Rede.
        </Text>

        <View style={styles.botoesContainer}>
          <TouchableOpacity
            style={[styles.botao, styles.botaoLaranja]}
            onPress={() => testarRequisicao('timeout')}
            disabled={carregando}
          >
            <Text style={styles.textoBotao}>Testar Timeout (5s)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botao, styles.botaoAzul]}
            onPress={() => testarRequisicao('404')}
            disabled={carregando}
          >
            <Text style={styles.textoBotao}>Testar Erro 404</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botao, styles.botaoRoxo]}
            onPress={() => testarRequisicao('rede')}
            disabled={carregando}
          >
            <Text style={styles.textoBotao}>Testar Falta de Rede</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botao, styles.botaoCinza]}
            onPress={() => testarRequisicao('normal')}
            disabled={carregando}
          >
            <Text style={styles.textoBotao}>Testar Normal (Status 200)</Text>
          </TouchableOpacity>
        </View>

        {carregando && (
          <View style={styles.carregandoContainer}>
            <ActivityIndicator size="small" color="#0284c7" />
            <Text style={styles.textoCarregando}>Aguardando resposta da requisição...</Text>
          </View>
        )}

        {resultadoTeste && (
          <View
            style={[
              styles.caixaResultado,
              resultadoTeste.tipo === 'timeout' && styles.caixaTimeout,
              resultadoTeste.tipo === '404' && styles.caixa404,
              resultadoTeste.tipo === 'rede' && styles.caixaRede,
              resultadoTeste.tipo === 'sucesso' && styles.caixaSucesso,
            ]}
          >
            <Text style={styles.resultadoTitulo}>{resultadoTeste.mensagem}</Text>
            {resultadoTeste.detalhes ? (
              <Text style={styles.resultadoDetalhes}>{resultadoTeste.detalhes}</Text>
            ) : null}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  titulo: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  subtitulo: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  instrucao: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  linhaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: { fontSize: 14, color: '#334155', fontWeight: '500' },
  valor: { fontSize: 14, color: '#0f172a', fontWeight: '600' },
  valorBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeVerde: { backgroundColor: '#dcfce7', color: '#166534' },
  badgeVermelho: { backgroundColor: '#fee2e2', color: '#991b1b' },
  textoVerde: { color: '#16a34a' },
  textoVermelho: { color: '#dc2626' },
  botoesContainer: { gap: 8, marginVertical: 8 },
  botao: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoLaranja: { backgroundColor: '#ea580c' },
  botaoAzul: { backgroundColor: '#0284c7' },
  botaoRoxo: { backgroundColor: '#7c3aed' },
  botaoCinza: { backgroundColor: '#475569' },
  textoBotao: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  carregandoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 6,
  },
  textoCarregando: { fontSize: 13, color: '#0369a1' },
  caixaResultado: {
    marginTop: 14,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  caixaTimeout: { backgroundColor: '#fff7ed', borderColor: '#fdba74' },
  caixa404: { backgroundColor: '#eff6ff', borderColor: '#93c5fd' },
  caixaRede: { backgroundColor: '#fef2f2', borderColor: '#fca5a5' },
  caixaSucesso: { backgroundColor: '#f0fdf4', borderColor: '#86efac' },
  resultadoTitulo: { fontSize: 14, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  resultadoDetalhes: { fontSize: 13, color: '#334155' },
});
