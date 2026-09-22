import AsyncStorage from "@react-native-async-storage/async-storage";
import { SQLiteProvider, useSQLiteContext } from "expo-sqlite";
import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  FlatList,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { initDb } from "./src/database/databaseSetup";

interface Tarefa {
  id: number;
  titulo: string;
  concluida: number;
}

function MainScreen() {
  const [nomeDigitado, setNomeDigitado] = useState("");
  const [nomeSalvo, setNomeSalvo] = useState<string | null>(null);
  const [novaTarefa, setNovaTarefa] = useState("");
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);

  const db = useSQLiteContext();

  useEffect(() => {
    carregarNome();
    carregarTarefas();
  }, []);

  // --- EXERCÍCIO 1: ---
  const salvarNome = async () => {
    if (!nomeDigitado.trim()) return;
    try {
      await AsyncStorage.setItem("usuario_nome", nomeDigitado);
      setNomeSalvo(nomeDigitado);
    } catch (e) {
      Alert.alert("Erro", "Não foi possível salvar o nome");
    }
  };

  const carregarNome = async () => {
    try {
      const nome = await AsyncStorage.getItem("usuario_nome");
      if (nome !== null) {
        setNomeSalvo(nome);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const sair = async () => {
    try {
      await AsyncStorage.removeItem("usuario_nome");
      setNomeSalvo(null);
      setNomeDigitado("");
    } catch (e) {
      console.error(e);
    }
  };

  // --- EXERCÍCIO 6: ---
  const carregarTarefas = async () => {
    try {
      const resultado = await db.getAllAsync<Tarefa>(
        "SELECT * FROM tarefas ORDER BY id DESC"
      );
      setTarefas(resultado);
    } catch (error) {
      console.error("Erro ao carregar tarefas:", error);
    }
  };

  // --- EXERCÍCIO 5: ---
  const adicionarTarefa = async (titulo: string) => {
    if (!titulo.trim()) return;
    try {
      await db.runAsync(
        "INSERT INTO tarefas (titulo, concluida) VALUES (?, ?)",
        [titulo, 0]
      );
      setNovaTarefa("");
      await carregarTarefas();
    } catch (error) {
      console.error("Erro ao adicionar tarefa:", error);
    }
  };

  // --- EXERCÍCIO 7: ---
  const alternarStatusTarefa = async (id: number, statusAtual: number) => {
    const novoStatus = statusAtual === 0 ? 1 : 0;
    try {
      await db.runAsync("UPDATE tarefas SET concluida = ? WHERE id = ?", [
        novoStatus,
        id,
      ]);
      await carregarTarefas();
    } catch (error) {
      console.error("Erro ao atualizar status:", error);
    }
  };

  // --- EXERCÍCIO 8: ---
  const deletarTarefa = async (id: number) => {
    try {
      await db.runAsync("DELETE FROM tarefas WHERE id = ?", [id]);
      await carregarTarefas();
    } catch (error) {
      console.error("Erro ao deletar tarefa:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {nomeSalvo ? (
          <View>
            <Text style={styles.textoBemVindo}>
              Bem-vindo de volta, {nomeSalvo}!
            </Text>
            <Button title="Sair" onPress={sair} color="red" />
          </View>
        ) : (
          <View>
            <TextInput
              style={styles.input}
              placeholder="Digite seu nome"
              value={nomeDigitado}
              onChangeText={setNomeDigitado}
            />
            <Button title="Salvar" onPress={salvarNome} />
          </View>
        )}
      </View>

      <View style={styles.divisor} />

      <TextInput
        style={styles.input}
        placeholder="Nova tarefa"
        value={novaTarefa}
        onChangeText={setNovaTarefa}
      />
      <Button
        title="Adicionar Tarefa"
        onPress={() => adicionarTarefa(novaTarefa)}
      />

      <FlatList
        data={tarefas}
        keyExtractor={(item) => item.id.toString()}
        style={{ marginTop: 20 }}
        renderItem={({ item }) => (
          <View style={styles.tarefaItem}>
            <Text
              style={[
                styles.tarefaTexto,
                item.concluida === 1 && styles.tarefaConcluida,
              ]}
            >
              {item.titulo}
            </Text>
            <View style={styles.acoes}>
              <Switch
                value={item.concluida === 1}
                onValueChange={() =>
                  alternarStatusTarefa(item.id, item.concluida)
                }
              />
              <Button
                title="X"
                onPress={() => deletarTarefa(item.id)}
                color="red"
              />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

// --- EXERCÍCIO 4:
export default function App() {
  return (
    <SQLiteProvider databaseName="tarefas.db" onInit={initDb}>
      <MainScreen />
    </SQLiteProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, marginTop: 40 },
  header: { marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    marginBottom: 10,
    borderRadius: 5,
  },
  textoBemVindo: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  divisor: { height: 1, backgroundColor: "#ccc", marginVertical: 20 },
  tarefaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#f9f9f9",
    marginBottom: 10,
    borderRadius: 5,
  },
  tarefaTexto: { fontSize: 16, flex: 1 },
  tarefaConcluida: { textDecorationLine: "line-through", color: "#888" },
  acoes: { flexDirection: "row", alignItems: "center", gap: 10 },
});
