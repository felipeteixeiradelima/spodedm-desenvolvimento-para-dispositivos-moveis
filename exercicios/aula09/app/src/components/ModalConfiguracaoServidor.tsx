import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  definirModoEmbutido,
  definirUrlServidor,
  testarConexaoApi,
  useConfiguracaoServidor,
} from '../services/configuracaoServidor';

type Props = {
  visivel: boolean;
  aoFechar: () => void;
};

export function ModalConfiguracaoServidor({ visivel, aoFechar }: Props) {
  const config = useConfiguracaoServidor();
  const [urlDigitada, setUrlDigitada] = useState(config.apiUrl);
  const [testando, setTestando] = useState(false);

  async function handleSalvarETestar() {
    if (!urlDigitada.trim()) return;
    setTestando(true);
    await definirUrlServidor(urlDigitada);
    setTestando(false);
  }

  async function handleAlternarModoEmbutido(novoValor: boolean) {
    setTestando(true);
    await definirModoEmbutido(novoValor);
    setTestando(false);
  }

  function aplicarAtalho(urlAtalho: string) {
    setUrlDigitada(urlAtalho);
  }

  return (
    <Modal visible={visivel} transparent animationType="slide">
      <View style={styles.fundo}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.scroll}>
            <View style={styles.topo}>
              <Text style={styles.titulo}>⚙️ Conexão com o Servidor</Text>
              <TouchableOpacity onPress={aoFechar} style={styles.botaoFechar}>
                <Text style={styles.textoBotaoFechar}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Status Atual */}
            <View
              style={[
                styles.bannerStatus,
                config.conectado === true && styles.bannerVerde,
                config.conectado === false && styles.bannerVermelho,
                config.conectado === null && styles.bannerAmarelo,
              ]}
            >
              <Text style={styles.statusTitulo}>
                {config.modoEmbutido
                  ? '⚡ MODO SERVIDOR EMBUTIDO'
                  : config.conectado === true
                  ? '🟢 CONECTADO AO SERVIDOR'
                  : config.conectado === false
                  ? '🔴 SERVIDOR INACESSÍVEL'
                  : '🟡 VERIFICANDO CONEXÃO...'}
              </Text>
              <Text style={styles.statusSub}>{config.mensagemStatus}</Text>
            </View>

            {/* Opção 1: Servidor Embutido */}
            <View style={styles.secao}>
              <View style={styles.linhaSwitch}>
                <View style={styles.infoSwitch}>
                  <Text style={styles.labelSecao}>Servidor Embutido no App</Text>
                  <Text style={styles.descSecao}>
                    Executa todas as rotas (tarefas, 409, retry, pull, produtos, ETag 304) direto na memória do celular.
                    Não requer túnel nem rede Wi-Fi!
                  </Text>
                </View>
                <Switch
                  value={config.modoEmbutido}
                  onValueChange={handleAlternarModoEmbutido}
                  trackColor={{ false: '#cbd5e1', true: '#86efac' }}
                  thumbColor={config.modoEmbutido ? '#16a34a' : '#f8fafc'}
                />
              </View>
            </View>

            {/* Opção 2: Conectar ao Servidor Remoto / Túnel */}
            {!config.modoEmbutido && (
              <View style={styles.secao}>
                <Text style={styles.labelSecao}>URL do Servidor Node (Porta 3000)</Text>
                <Text style={styles.descSecao}>
                  Se estiver usando celular em rede universitária, use uma URL de túnel (ex.: Ngrok ou Localtunnel)
                  ou o IP local do seu computador.
                </Text>

                <TextInput
                  style={styles.input}
                  value={urlDigitada}
                  onChangeText={setUrlDigitada}
                  placeholder="https://sua-url-ngrok.ngrok-free.app"
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                {/* Atalhos Rápidos */}
                <Text style={styles.labelAtalhos}>Atalhos rápidos:</Text>
                <View style={styles.gridAtalhos}>
                  <TouchableOpacity
                    style={styles.botaoAtalho}
                    onPress={() => aplicarAtalho('http://localhost:3000')}
                  >
                    <Text style={styles.textoAtalho}>localhost:3000 (Web/PC)</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.botaoAtalho}
                    onPress={() => aplicarAtalho('http://10.0.2.2:3000')}
                  >
                    <Text style={styles.textoAtalho}>10.0.2.2:3000 (Emulador)</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.botaoSalvar, testando && styles.botaoDesabilitado]}
                  onPress={handleSalvarETestar}
                  disabled={testando}
                >
                  {testando ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.textoBotaoSalvar}>Salvar e Testar Conexão</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Ajuda Educativa */}
            <View style={styles.boxAjuda}>
              <Text style={styles.tituloAjuda}>💡 Por que o celular mostra "Sem conexão"?</Text>
              <Text style={styles.textoAjuda}>
                1. O comando <Text style={styles.codigo}>npx expo start --tunnel</Text> cria túnel apenas para o aplicativo na porta 8081. O backend Node roda na porta 3000 do computador.
                {'\n'}
                2. No celular físico, <Text style={styles.codigo}>localhost</Text> aponta para o próprio celular e não encontra a porta 3000.
                {'\n'}
                3. Em redes universitárias (como eduroam), computadores e celulares são isolados por segurança.
                {'\n'}
                👉 <Text style={styles.negrito}>Solução imediata:</Text> Ative o switch "Servidor Embutido no App" acima e todos os exercícios funcionarão com perfeição no celular!
              </Text>
            </View>

            <TouchableOpacity style={styles.botaoConcluir} onPress={aoFechar}>
              <Text style={styles.textoBotaoConcluir}>Concluir</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fundo: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    maxHeight: '90%',
    overflow: 'hidden',
  },
  scroll: {
    padding: 20,
  },
  topo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  botaoFechar: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  textoBotaoFechar: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '700',
  },
  bannerStatus: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  bannerVerde: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
  },
  bannerVermelho: {
    backgroundColor: '#fef2f2',
    borderColor: '#fca5a5',
  },
  bannerAmarelo: {
    backgroundColor: '#fefce8',
    borderColor: '#fde047',
  },
  statusTitulo: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 4,
  },
  statusSub: {
    fontSize: 12,
    color: '#334155',
  },
  secao: {
    backgroundColor: '#f8fafc',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  linhaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  infoSwitch: {
    flex: 1,
    marginRight: 12,
  },
  labelSecao: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  descSecao: {
    fontSize: 12,
    color: '#64748b',
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
    marginTop: 10,
  },
  labelAtalhos: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 12,
    marginBottom: 6,
  },
  gridAtalhos: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  botaoAtalho: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  textoAtalho: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  botaoSalvar: {
    backgroundColor: '#0284c7',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  botaoDesabilitado: {
    opacity: 0.6,
  },
  textoBotaoSalvar: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  boxAjuda: {
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0284c7',
  },
  tituloAjuda: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0369a1',
    marginBottom: 6,
  },
  textoAjuda: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
  },
  codigo: {
    fontFamily: 'monospace',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
  },
  negrito: {
    fontWeight: '700',
    color: '#0f172a',
  },
  botaoConcluir: {
    backgroundColor: '#0f172a',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  textoBotaoConcluir: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
