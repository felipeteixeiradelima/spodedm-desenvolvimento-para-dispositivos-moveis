import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { formatarDataHora } from '../storage/cache';
import {
  buscarEstatisticas,
  carregar,
  criarTarefa,
  editarSomenteNoServidor,
  editarTarefa,
  EstatisticasServidor,
  excluirSomenteNoServidor,
  excluirTarefa,
  limparDadosLocais,
  resolverConflito,
  sincronizar,
  Tarefa,
  useTarefas,
} from '../sync/tarefas';
import { comRetry, requisicaoJson } from '../services/http';

export function Aula2e3Screen() {
  const estado = useTarefas();

  const [novoTitulo, setNovoTitulo] = useState('');
  const [editandoTarefa, setEditandoTarefa] = useState<Tarefa | null>(null);
  const [tituloEdicao, setTituloEdicao] = useState('');
  const [estatisticas, setEstatisticas] = useState<EstatisticasServidor | null>(null);
  const [carregandoAcao, setCarregandoAcao] = useState(false);
  const [logRetry, setLogRetry] = useState<string[]>([]);

  useEffect(() => {
    // Carrega dados iniciais do cache local (primeiro o cache)
    carregar().then(() => {
      // E em seguida dispara a sincronização com a API
      void sincronizar();
    });
  }, []);

  async function handleCriar() {
    if (!novoTitulo.trim()) return;
    const t = novoTitulo;
    setNovoTitulo('');
    await criarTarefa(t);
  }

  async function handleSalvarEdicao() {
    if (!editandoTarefa || !tituloEdicao.trim()) return;
    const id = editandoTarefa.id;
    const tit = tituloEdicao;
    setEditandoTarefa(null);
    await editarTarefa(id, { titulo: tit });
  }

  async function handleVerificarDuplicidade() {
    setCarregandoAcao(true);
    try {
      const stats = await buscarEstatisticas();
      setEstatisticas(stats);
      if (stats.titulosDuplicados.length === 0) {
        Alert.alert(
          'Validação de Idempotência',
          `Nenhuma tarefa duplicada encontrada!\nTotal no servidor: ${stats.totalTarefas}\nPosts repetidos absorvidos: ${stats.postsRepetidos}\nChaves de Idempotência salvas: ${stats.chavesIdempotencia}`,
        );
      } else {
        Alert.alert(
          'Atenção',
          `Tarefas com mesmo título detectadas: ${JSON.stringify(stats.titulosDuplicados)}`,
        );
      }
    } catch (e: any) {
      Alert.alert('Erro ao buscar estatísticas', e.message);
    } finally {
      setCarregandoAcao(false);
    }
  }

  async function handleConfigurarFalhaServidor(quantidade: number = 2) {
    setCarregandoAcao(true);
    try {
      await requisicaoJson('/config', {
        method: 'POST',
        body: JSON.stringify({ falharProximas: quantidade }),
      });
      Alert.alert(
        'Servidor configurado',
        `As próximas ${quantidade} requisições responderão 503 para testar o comRetry e a fila offline.`,
      );
    } catch (e: any) {
      Alert.alert('Erro', e.message);
    } finally {
      setCarregandoAcao(false);
    }
  }

  async function handleTestarRetry() {
    setLogRetry([]);
    setCarregandoAcao(true);

    try {
      // Força as próximas 2 requisições a responderem com erro 503
      await requisicaoJson('/config', {
        method: 'POST',
        body: JSON.stringify({ falharProximas: 2 }),
      });

      const mensagens: string[] = ['Iniciando teste de comRetry com backoff exponencial...'];
      setLogRetry([...mensagens]);

      const resultado = await comRetry(
        () => requisicaoJson<{ alteradas: Tarefa[]; marcador: number }>('/tarefas?since=0'),
        {
          tentativas: 4,
          baseMs: 400,
          aoFalhar: ({ tentativa, esperaMs, erro }) => {
            const linha = `Tentativa ${tentativa} falhou (${(erro as any).message}). Aguardando ${esperaMs}ms...`;
            mensagens.push(linha);
            setLogRetry([...mensagens]);
          },
        },
      );

      mensagens.push(`✅ Sucesso final após tentativas! Total de tarefas: ${resultado.alteradas.length}`);
      setLogRetry([...mensagens]);
    } catch (e: any) {
      setLogRetry((prev) => [...prev, `❌ Falhou definitivamente: ${e.message}`]);
    } finally {
      setCarregandoAcao(false);
    }
  }

  const conflitoAtivo = estado.conflitos.length > 0 ? estado.conflitos[0] : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.titulo}>Aula 2 & 3 - Resiliência, Offline e Sincronização</Text>

      {/* Card: Status do Cache e Sincronização */}
      <View style={styles.card}>
        <Text style={styles.subtitulo}>Estado do Cache e Sincronização</Text>

        <View style={styles.linhaInfo}>
          <Text style={styles.label}>Origem atual dos dados:</Text>
          <Text style={[styles.badge, estado.origem === 'api' ? styles.badgeAzul : styles.badgeAmarelo]}>
            {estado.origem === 'api' ? 'API (Servidor)' : 'Cache Local'}
          </Text>
        </View>

        <View style={styles.linhaInfo}>
          <Text style={styles.label}>Salvo no Cache em:</Text>
          <Text style={styles.valor}>
            {estado.salvoEm ? formatarDataHora(estado.salvoEm) : 'Nunca'}
          </Text>
        </View>

        <View style={styles.linhaInfo}>
          <Text style={styles.label}>Marcador since atual:</Text>
          <Text style={styles.valor}>{estado.marcador ?? '0 (inicial)'}</Text>
        </View>

        <View style={styles.linhaInfo}>
          <Text style={styles.label}>Fila de Pendências Offline:</Text>
          <Text style={[styles.valor, estado.fila.length > 0 && styles.textoLaranja]}>
            {estado.fila.length} operação(ões)
          </Text>
        </View>

        {estado.ultimoErro && (
          <View style={styles.alertaErro}>
            <Text style={styles.textoAlertaErro}>{estado.ultimoErro}</Text>
          </View>
        )}

        <View style={styles.botoesLinha}>
          <TouchableOpacity
            style={[styles.botaoPequeno, styles.botaoAzul]}
            onPress={() => sincronizar()}
            disabled={estado.sincronizando}
          >
            {estado.sincronizando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.textoBotaoPequeno}>Sincronizar (Pull/Push)</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoPequeno, styles.botaoCinza]}
            onPress={limparDadosLocais}
          >
            <Text style={styles.textoBotaoPequeno}>Limpar Cache Local</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Card: Testes da Aula 2 (Retry, Falhas, Idempotência) */}
      <View style={styles.card}>
        <Text style={styles.subtitulo}>Testes de Resiliência (Aula 2)</Text>
        <Text style={styles.instrucao}>
          Simule falhas no servidor para verificar o comRetry e a confirmação de que nenhuma tarefa é duplicada (Idempotency-Key).
        </Text>

        <View style={styles.botoesGrid}>
          <TouchableOpacity
            style={[styles.botaoGrid, styles.botaoLaranja]}
            onPress={() => handleConfigurarFalhaServidor(2)}
            disabled={carregandoAcao}
          >
            <Text style={styles.textoBotaoGrid}>Simular 2 Falhas 503</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoGrid, styles.botaoRoxo]}
            onPress={handleTestarRetry}
            disabled={carregandoAcao}
          >
            <Text style={styles.textoBotaoGrid}>Testar comRetry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.botaoGrid, styles.botaoVerde]}
            onPress={handleVerificarDuplicidade}
            disabled={carregandoAcao}
          >
            <Text style={styles.textoBotaoGrid}>Verificar Idempotência</Text>
          </TouchableOpacity>
        </View>

        {logRetry.length > 0 && (
          <View style={styles.caixaLog}>
            <Text style={styles.tituloLog}>Log de Execução do comRetry:</Text>
            {logRetry.map((msg, i) => (
              <Text key={i} style={styles.itemLog}>{msg}</Text>
            ))}
          </View>
        )}
      </View>

      {/* Card: Formulário para Adicionar Tarefa */}
      <View style={styles.card}>
        <Text style={styles.subtitulo}>Nova Tarefa (Offline-First)</Text>
        <Text style={styles.instrucao}>
          Pode criar mesmo no Modo Avião! A tarefa entra na fila com Idempotency-Key e sincroniza quando a conexão voltar.
        </Text>

        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Digite o título da tarefa..."
            value={novoTitulo}
            onChangeText={setNovoTitulo}
          />
          <TouchableOpacity style={[styles.botao, styles.botaoAzul]} onPress={handleCriar}>
            <Text style={styles.textoBotao}>+ Adicionar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de Tarefas com indicação de sincronizado / pendente (Aula 3 - Ex 2) */}
      <View style={styles.card}>
        <Text style={styles.subtitulo}>
          Lista de Tarefas ({estado.tarefas.length})
        </Text>

        {estado.tarefas.length === 0 ? (
          <Text style={styles.textoVazio}>Nenhuma tarefa cadastrada.</Text>
        ) : (
          estado.tarefas.map((tarefa) => (
            <View key={tarefa.id} style={styles.itemTarefa}>
              <View style={styles.topoTarefa}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() => editarTarefa(tarefa.id, { concluida: !tarefa.concluida })}
                >
                  <Text style={styles.textoCheckbox}>{tarefa.concluida ? '☑️' : '⬜'}</Text>
                </TouchableOpacity>

                <View style={styles.infoTarefa}>
                  <Text
                    style={[
                      styles.tituloTarefa,
                      tarefa.concluida && styles.tarefaConcluida,
                    ]}
                  >
                    {tarefa.titulo}
                  </Text>
                  <View style={styles.badgesTarefa}>
                    <Text
                      style={[
                        styles.badgeStatus,
                        tarefa.sincronizado ? styles.badgeSincronizado : styles.badgePendente,
                      ]}
                    >
                      {tarefa.sincronizado ? '● Sincronizado' : '⏳ Pendente'}
                    </Text>
                    <Text style={styles.badgeVersao}>v{tarefa.versao}</Text>
                  </View>
                </View>
              </View>

              {/* Ações de simulação de concorrência e exclusão */}
              <View style={styles.acoesTarefa}>
                <TouchableOpacity
                  style={styles.botaoAcao}
                  onPress={() => {
                    setEditandoTarefa(tarefa);
                    setTituloEdicao(tarefa.titulo);
                  }}
                >
                  <Text style={styles.textoAcao}>✏️ Editar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botaoAcao}
                  onPress={() => editarSomenteNoServidor(tarefa.id)}
                >
                  <Text style={styles.textoAcao}>⚡ Alterar no Servidor (Gerar 409)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.botaoAcao}
                  onPress={() => excluirSomenteNoServidor(tarefa.id)}
                >
                  <Text style={styles.textoAcao}>🗑️ Excluir no Servidor</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.botaoAcao, styles.botaoAcaoExcluir]}
                  onPress={() => excluirTarefa(tarefa.id)}
                >
                  <Text style={styles.textoAcaoExcluir}>Remover</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Modal / Tela de Edição Simples */}
      <Modal visible={!!editandoTarefa} transparent animationType="fade">
        <View style={styles.modalFundo}>
          <View style={styles.modalConteudo}>
            <Text style={styles.modalTitulo}>Editar Tarefa (v{editandoTarefa?.versao})</Text>
            <TextInput
              style={styles.inputModal}
              value={tituloEdicao}
              onChangeText={setTituloEdicao}
              autoFocus
            />
            <View style={styles.modalBotoes}>
              <TouchableOpacity
                style={[styles.botaoModal, styles.botaoCinza]}
                onPress={() => setEditandoTarefa(null)}
              >
                <Text style={styles.textoBotao}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.botaoModal, styles.botaoAzul]}
                onPress={handleSalvarEdicao}
              >
                <Text style={styles.textoBotao}>Salvar (Envia versão)</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Aula 3 - Exercício 5: Tela/Modal para escolher entre manter a sua versão ou usar a do servidor */}
      <Modal visible={!!conflitoAtivo} transparent animationType="slide">
        <View style={styles.modalFundo}>
          <View style={[styles.modalConteudo, styles.modalConflito]}>
            <Text style={styles.conflitoTitulo}>⚠️ Conflito de Versão Detectado (409)!</Text>
            <Text style={styles.conflitoDesc}>
              A tarefa foi alterada no servidor por outro usuário enquanto você editava.
              Escolha qual versão deseja manter:
            </Text>

            <View style={styles.comparacaoContainer}>
              <View style={styles.colunaVersao}>
                <Text style={styles.rotuloVersao}>Sua Versão (Local):</Text>
                <Text style={styles.textoVersao}>{conflitoAtivo?.local.titulo}</Text>
                <Text style={styles.infoVersao}>v{conflitoAtivo?.local.versao}</Text>
                <TouchableOpacity
                  style={[styles.botaoEscolha, styles.botaoAzul]}
                  onPress={() => conflitoAtivo && resolverConflito(conflitoAtivo.tarefaId, 'minha')}
                >
                  <Text style={styles.textoBotao}>Manter Minha Versão</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divisorColuna} />

              <View style={styles.colunaVersao}>
                <Text style={styles.rotuloVersao}>Versão do Servidor:</Text>
                <Text style={styles.textoVersao}>{conflitoAtivo?.servidor.titulo}</Text>
                <Text style={styles.infoVersao}>v{conflitoAtivo?.servidor.versao}</Text>
                <TouchableOpacity
                  style={[styles.botaoEscolha, styles.botaoVerde]}
                  onPress={() => conflitoAtivo && resolverConflito(conflitoAtivo.tarefaId, 'servidor')}
                >
                  <Text style={styles.textoBotao}>Usar Versão do Servidor</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 50 },
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
  linhaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  label: { fontSize: 13, color: '#475569' },
  valor: { fontSize: 13, fontWeight: '600', color: '#0f172a' },
  textoLaranja: { color: '#ea580c' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, fontSize: 11, fontWeight: '700' },
  badgeAzul: { backgroundColor: '#e0f2fe', color: '#0369a1' },
  badgeAmarelo: { backgroundColor: '#fef3c7', color: '#92400e' },
  alertaErro: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
    borderWidth: 1,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  textoAlertaErro: { color: '#991b1b', fontSize: 12 },
  botoesLinha: { flexDirection: 'row', gap: 8, marginTop: 12 },
  botaoPequeno: { flex: 1, paddingVertical: 9, borderRadius: 6, alignItems: 'center' },
  textoBotaoPequeno: { color: '#fff', fontSize: 12, fontWeight: '600' },
  botoesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  botaoGrid: { flex: 1, minWidth: '30%', paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  textoBotaoGrid: { color: '#fff', fontSize: 11, fontWeight: '600', textAlign: 'center' },
  botaoAzul: { backgroundColor: '#0284c7' },
  botaoLaranja: { backgroundColor: '#ea580c' },
  botaoRoxo: { backgroundColor: '#7c3aed' },
  botaoVerde: { backgroundColor: '#16a34a' },
  botaoCinza: { backgroundColor: '#64748b' },
  textoBotao: { color: '#fff', fontSize: 13, fontWeight: '600' },
  caixaLog: {
    backgroundColor: '#0f172a',
    padding: 10,
    borderRadius: 6,
    marginTop: 12,
  },
  tituloLog: { color: '#93c5fd', fontSize: 12, fontWeight: '700', marginBottom: 4 },
  itemLog: { color: '#e2e8f0', fontSize: 11, fontFamily: 'monospace', marginBottom: 2 },
  formContainer: { flexDirection: 'row', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  botao: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, justifyContent: 'center' },
  textoVazio: { fontSize: 13, color: '#94a3b8', fontStyle: 'italic', marginVertical: 8 },
  itemTarefa: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginVertical: 6,
  },
  topoTarefa: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { marginRight: 10 },
  textoCheckbox: { fontSize: 20 },
  infoTarefa: { flex: 1 },
  tituloTarefa: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  tarefaConcluida: { textDecorationLine: 'line-through', color: '#94a3b8' },
  badgesTarefa: { flexDirection: 'row', gap: 8, marginTop: 4 },
  badgeStatus: { fontSize: 11, fontWeight: '700', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeSincronizado: { backgroundColor: '#dcfce7', color: '#15803d' },
  badgePendente: { backgroundColor: '#fef3c7', color: '#b45309' },
  badgeVersao: { fontSize: 11, backgroundColor: '#e2e8f0', color: '#475569', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  acoesTarefa: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8 },
  botaoAcao: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  textoAcao: { fontSize: 11, color: '#334155' },
  botaoAcaoExcluir: { backgroundColor: '#fee2e2' },
  textoAcaoExcluir: { fontSize: 11, color: '#dc2626', fontWeight: '600' },
  modalFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 16 },
  modalConteudo: { backgroundColor: '#fff', width: '100%', maxWidth: 400, borderRadius: 12, padding: 20 },
  modalTitulo: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 12 },
  inputModal: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 16 },
  modalBotoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  botaoModal: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  modalConflito: { maxWidth: 500 },
  conflitoTitulo: { fontSize: 16, fontWeight: '700', color: '#dc2626', marginBottom: 8 },
  conflitoDesc: { fontSize: 13, color: '#475569', marginBottom: 16 },
  comparacaoContainer: { flexDirection: 'row', gap: 12 },
  colunaVersao: { flex: 1, backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  divisorColuna: { width: 1, backgroundColor: '#e2e8f0' },
  rotuloVersao: { fontSize: 12, fontWeight: '700', color: '#64748b', marginBottom: 4 },
  textoVersao: { fontSize: 14, fontWeight: '600', color: '#0f172a', marginBottom: 6 },
  infoVersao: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  botaoEscolha: { paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
});
