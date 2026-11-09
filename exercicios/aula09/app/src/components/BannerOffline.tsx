import { StyleSheet, Text, View } from 'react-native';
import { useOnline } from '../hooks/useOnline';

/** Aula 1 - Exercício 3: banner exibido no topo do app quando não há conexão. */
export function BannerOffline() {
  const online = useOnline();

  if (online) return null;

  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.texto}>Sem conexão — as alterações serão enviadas quando a internet voltar.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#c62828', paddingHorizontal: 16, paddingVertical: 8 },
  texto: { color: '#fff', fontWeight: '600', textAlign: 'center' },
});
