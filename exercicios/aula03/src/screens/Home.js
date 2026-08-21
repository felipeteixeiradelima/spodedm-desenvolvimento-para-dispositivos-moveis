import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useIsFocused } from "@react-navigation/native";

export default function Home({ navigation }) {
  const [locais, setLocais] = useState([]);
  const isFocused = useIsFocused(); // Hook para saber se a tela está em foco

  useEffect(() => {
    // Recarrega os dados toda vez que a tela ganhar foco
    if (isFocused) {
      carregarDados();
    }
  }, [isFocused]);

  const carregarDados = async () => {
    try {
      const dados = await AsyncStorage.getItem("@diario_locais");
      if (dados) {
        setLocais(JSON.parse(dados));
      }
    } catch (error) {
      console.error("Erro ao carregar locais:", error);
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.itemCard}>
      <Text style={styles.itemTitle}>{item.nome}</Text>
      <Text style={styles.itemText}>📍 Latitude: {item.latitude}</Text>
      <Text style={styles.itemText}>📍 Longitude: {item.longitude}</Text>
      {item.codigo ? (
        <Text style={styles.itemText}>🏷️ Cód: {item.codigo}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={locais}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nenhum local registrado ainda.</Text>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate("NovoRegistro")}
      >
        <Text style={styles.fabText}>+ Novo Registro</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F7",
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  itemCard: {
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#1C1C1E",
  },
  itemText: {
    fontSize: 14,
    color: "#3A3A3C",
    marginBottom: 4,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
    color: "#8E8E93",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#007AFF",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 4,
  },
  fabText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
