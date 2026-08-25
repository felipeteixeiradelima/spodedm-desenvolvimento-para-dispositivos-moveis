import React, { useContext, useState } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { InventoryContext } from "../contexts/InventoryContext";

export default function Clientes({ navigation }) {
  const {
    clientes,
    adicionarCliente,
    carregarClientes,
    removerCliente,
  } = useContext(InventoryContext);
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");

  const handleAddCliente = () => {
    if (nome && cpf && email) {
      adicionarCliente(nome, cpf, email);
      setNome("");
      setCpf("");
      setEmail("");
    } else {
      Alert.alert(
        "Erro",
        "Preencha todos os campos para adicionar um cliente."
      );
    }
  };
  const handleEditCliente = (id) => {
    navigation.navigate("EditCliente", { id });
  };

  const handleDeleteCliente = (id) => {
    Alert.alert(
      "Confirmar Exclusão",
      "Tem certeza que deseja excluir este cliente?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: () => {
            removerCliente(id);
            carregarClientes();
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cadastro de Clientes</Text>
      <TextInput
        style={styles.input}
        placeholder="Nome"
        value={nome}
        onChangeText={setNome}
      />
      <TextInput
        style={styles.input}
        placeholder="CPF"
        value={cpf}
        onChangeText={setCpf}
      />
      <TextInput
        style={styles.input}
        placeholder="E-mail"
        value={email}
        onChangeText={setEmail}
      />
      <TouchableOpacity style={styles.btnAdd} onPress={handleAddCliente}>
        <Text style={styles.btnText}>Adicionar Cliente</Text>
      </TouchableOpacity>
      <FlatList
        data={clientes}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text style={styles.nome}>{item.nome}</Text>
              <Text style={styles.cpf}>CPF: {item.cpf}</Text>
              <Text style={styles.email}>E-mail: {item.email}</Text>
            </View>
            <View>
              <TouchableOpacity
                style={styles.btnDelete}
                onPress={() => handleDeleteCliente(item.id)}
              >
                <Text style={styles.btnText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f5f5f5" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  btnAdd: {
    backgroundColor: "#2ecc71",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  btnText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
  item: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
  },
  nome: { fontSize: 18, fontWeight: "bold" },
  cpf: { color: "#666", marginTop: 4 },
  email: { color: "#999", fontSize: 12, marginTop: 4 },
  btnDelete: {
    backgroundColor: "#e74c3c",
    padding: 7,
    borderRadius: 5,
    marginTop: 5,
  },
});
