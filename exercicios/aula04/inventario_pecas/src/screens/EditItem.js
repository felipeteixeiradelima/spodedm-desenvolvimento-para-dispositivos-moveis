import React, { useContext, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { InventoryContext } from "../contexts/InventoryContext";

export default function EditItem({ navigation, route }) {
  const { pecas, editarPeca } = useContext(InventoryContext);
  const { id } = route.params;
  const [quantidade, setQuantidade] = useState("1");
  const peca = pecas.find((item) => item.id === id);

  useEffect(() => {
    if (peca) {
      setQuantidade(String(peca.quantidade));
    }
  }, [peca]);

  const salvar = () => {
    const novaQuantidade = parseInt(quantidade, 10);

    if (!peca) {
      Alert.alert("Erro", "Peça não encontrada.");
      return;
    }

    if (Number.isNaN(novaQuantidade) || novaQuantidade <= 0) {
      Alert.alert("Erro", "A quantidade deve ser maior que zero.");
      return;
    }

    editarPeca(
      id,
      peca.nome,
      peca.categoria,
      novaQuantidade,
      peca.serial,
      peca.imagemUri,
    );
    navigation.goBack();
  };

  if (!peca) {
    return (
      <ScrollView style={styles.container}>
        <Text>Carregando peça...</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Nome do Componente</Text>
      <TextInput
        style={styles.input}
        value={peca.nome}
        placeholder="Ex: Placa de Vídeo"
        editable={false}
      />

      <Text style={styles.label}>Categoria</Text>
      <TextInput
        style={styles.input}
        value={peca.categoria}
        placeholder="Ex: Sucata / Reparo"
        editable={false}
      />

      <Text style={styles.label}>Quantidade</Text>
      <TextInput
        style={styles.input}
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Número de Série</Text>
      <TextInput
        style={styles.input}
        value={peca.serial}
        placeholder="SN-XXXXX"
        editable={false}
      />

      <TouchableOpacity style={styles.btn} onPress={salvar}>
        <Text style={styles.btnText}>Salvar Componente</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  label: { fontSize: 16, fontWeight: "bold", marginBottom: 5, color: "#333" },
  input: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  btn: {
    backgroundColor: "#27ae60",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 10,
  },
  btnText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
