import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";

export default function Home() {
  const [tarefas, setTarefas] = useState([]);
  const [novaTarefa, setNovaTarefa] = useState("");

  function adicionarTarefa() {
    if (novaTarefa === "") return;
    setTarefas([
      ...tarefas,
      { id: String(Date.now()), texto: novaTarefa, concluida: false },
    ]);
    setNovaTarefa("");
  }

  function removerTarefa(id) {
    if (id === null) return;
    setTarefas([
      ...tarefas.filter((item) => {
        return item.id !== id;
      }),
    ]);
  }

  function concluirTarefa(item) {
    if ((item === null) | (item.concluida === true)) return;
    item.concluida = true;
    item.texto = item.texto + "  (CONCLUÍDA ✅)";
    setTarefas([...tarefas]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titulo}>Minhas Tarefas</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="O que preciso fazer?"
          placeholderTextColor="#777777"
          value={novaTarefa}
          onChangeText={setNovaTarefa}
        />
        <TouchableOpacity style={styles.botao} onPress={adicionarTarefa}>
          <Text style={styles.textoBotao}>+</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={tarefas}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.tarefaItem} id={item.id} >
            <Text style={styles.tarefaTexto}>{item.texto}</Text>
            <TouchableOpacity onPress={() => removerTarefa(item.id)}>
              <Text style={styles.botaoRemover}>X</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => concluirTarefa(item)}>
              <Text style={styles.botaoConcluir}>✓</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#121214" },
  titulo: { fontSize: 24, fontWeight: "bold", color: "#FFF", marginBottom: 20 },
  form: { flexDirection: "row", marginBottom: 24 },
  input: {
    flex: 1,
    backgroundColor: "#202024",
    color: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
  },
  botao: {
    backgroundColor: "#22C55E",
    padding: 16,
    borderRadius: 8,
    marginLeft: 12,
  },
  textoBotao: {
    color: "white",
    fontSize: 14,
    fontWeight: 700,
  },
  botaoRemover: {
    textAlign: "center",
    backgroundColor: "red",
    color: "white",
    fontWeight: 700,
    width: 32,
    padding: 8,
    borderRadius: 8,
    marginLeft: "auto",
    marginRight: 12,
  },
  botaoConcluir: {
    textAlign: "center",
    backgroundColor: "green",
    color: "white",
    fontWeight: 700,
    width: 32,
    padding: 8,
    borderRadius: 8,
    marginLeft: "auto",
  },
  tarefaItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#202024",
    borderRadius: 8,
    marginBottom: 12,
  },
  tarefaTexto: {
    color: "#FFFFFF",
    marginRight: "auto",
  },
});
