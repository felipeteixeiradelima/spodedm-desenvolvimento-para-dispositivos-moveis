import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { BannerOffline } from './src/components/BannerOffline';
import { Aula1Screen } from './src/screens/Aula1Screen';
import { Aula2e3Screen } from './src/screens/Aula2e3Screen';
import { Aula4Screen } from './src/screens/Aula4Screen';

type AbaAtiva = 'aula1' | 'aula2e3' | 'aula4';

export default function App() {
  const [abaAtiva, setAbaAtiva] = useState<AbaAtiva>('aula1');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <StatusBar style="dark" />

        {/* Banner Offline exigido na Aula 1 - Exercício 3 */}
        <BannerOffline />

        {/* Cabeçalho do Aplicativo */}
        <View style={styles.header}>
          <Text style={styles.headerTitulo}>Exercícios Aula 09</Text>
          <Text style={styles.headerSub}>Conectividade, Offline, Sincronização & Consumo</Text>
        </View>

        {/* Barra de Navegação por Abas */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tabItem, abaAtiva === 'aula1' && styles.tabItemAtivo]}
            onPress={() => setAbaAtiva('aula1')}
          >
            <Text style={[styles.textoTab, abaAtiva === 'aula1' && styles.textoTabAtivo]}>
              Aula 1
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, abaAtiva === 'aula2e3' && styles.tabItemAtivo]}
            onPress={() => setAbaAtiva('aula2e3')}
          >
            <Text style={[styles.textoTab, abaAtiva === 'aula2e3' && styles.textoTabAtivo]}>
              Aulas 2 & 3
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, abaAtiva === 'aula4' && styles.tabItemAtivo]}
            onPress={() => setAbaAtiva('aula4')}
          >
            <Text style={[styles.textoTab, abaAtiva === 'aula4' && styles.textoTabAtivo]}>
              Aula 4
            </Text>
          </TouchableOpacity>
        </View>

        {/* Conteúdo da Tela Selecionada */}
        <View style={styles.conteudo}>
          {abaAtiva === 'aula1' && <Aula1Screen />}
          {abaAtiva === 'aula2e3' && <Aula2e3Screen />}
          {abaAtiva === 'aula4' && <Aula4Screen />}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTitulo: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemAtivo: {
    borderBottomColor: '#0284c7',
    backgroundColor: '#ffffff',
  },
  textoTab: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  textoTabAtivo: {
    color: '#0284c7',
    fontWeight: '700',
  },
  conteudo: {
    flex: 1,
  },
});
