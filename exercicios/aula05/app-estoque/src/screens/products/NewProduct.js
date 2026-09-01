import React, { useContext, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { InventoryContext } from "../../contexts/InventoryContext";

export default function NewProduct({ navigation }) {
  const { adicionarProduto } = useContext(InventoryContext);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [quantidade, setQuantidade] = useState("1");
  const [fornecedor, setFornecedor] = useState("");

  const salvar = () => {
    if (!codigo || !nome || !fornecedor) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    if (quantidade <= 0) {
      Alert.alert("Erro", "A quantidade deve ser maior que zero.");
      return;
    }

    adicionarProduto(codigo, nome, parseInt(quantidade), fornecedor);
    Alert.alert("Sucesso", "Produto registado com sucesso!");
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.label}>Código do Produto</Text>
      <TextInput
        style={styles.input}
        value={codigo}
        onChangeText={setCodigo}
        placeholder="Ex: 789XXXXXXXXXX"
      />

      <Text style={styles.label}>Nome do Produto</Text>
      <TextInput
        style={styles.input}
        value={nome}
        onChangeText={setNome}
        placeholder="Ex: Baralho de Cartas"
      />

      <Text style={styles.label}>Quantidade</Text>
      <TextInput
        style={styles.input}
        value={quantidade}
        onChangeText={setQuantidade}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Fornecedor</Text>
      <TextInput
        style={styles.input}
        value={fornecedor}
        onChangeText={setFornecedor}
        placeholder="New Horizons Ltda"
      />

      <TouchableOpacity style={styles.btn} onPress={salvar}>
        <Text style={styles.btnText}>Salvar Produto</Text>
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
