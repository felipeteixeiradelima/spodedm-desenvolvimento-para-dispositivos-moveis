import { useContext, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { InventoryContext } from "../contexts/InventoryContext";

export default function Inventory({ navigation }) {
  const { produtos, removerProdutos } = useContext(InventoryContext);
  const [busca, setBusca] = useState("");

  const produtosFiltrados = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(busca.toLowerCase()) ||
      p.fornecedor.toLowerCase().includes(busca.toLowerCase()),
  );

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Pesquisar produto ou fornecedor..."
        value={busca}
        onChangeText={setBusca}
      />
      <TouchableOpacity
        style={styles.btnNew}
        onPress={() => navigation.navigate("NewProduct")}
      >
        <Text style={styles.btnText}>Adicionar Produto</Text>
      </TouchableOpacity>
      <FlatList
        data={produtosFiltrados}
        keyExtractor={(item) => item.codigo.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View>
              <Text
                style={styles.nome}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
              >
                {item.nome}
              </Text>
              <Text style={styles.codigo}>Código: {item.codigo}</Text>
              <Text style={styles.fornecedor}>
                Fornecedor: {item.fornecedor}
              </Text>
              <Text style={styles.quantidade}>Qtd: {item.quantidade}</Text>
            </View>
            <View style={styles.btnGroup}>
              <TouchableOpacity
                style={styles.btnEdit}
                onPress={() =>
                  navigation.navigate("EditProduct", { codigo: item.codigo })
                }
              >
                <Text style={styles.btnText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnDelete}
                onPress={() => removerProdutos(item.codigo)}
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
  input: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#ddd",
  },
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
  nome: { fontSize: 18, fontWeight: "bold", maxWidth: "90%" },
  fornecedor: { color: "#665", marginTop: 4 },
  quantidade: { color: "#665", marginTop: 4 },
  codigo: { color: "#999", fontSize: 12, marginTop: 4 },
  btnNew: {
    backgroundColor: "green",
    padding: 8,
    borderRadius: 5,
  },
  btnEdit: {
    backgroundColor: "#3498db",
    padding: 8,
    borderRadius: 5,
    marginBottom: 5,
  },
  btnDelete: {
    backgroundColor: "#e74c3c",
    padding: 8,
    borderRadius: 5,
    marginTop: 5,
  },
  btnText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
});
