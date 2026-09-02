import { Ionicons } from "@expo/vector-icons";
import { useContext } from "react";
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { UserContext } from "../contexts/UserContext";

export default function User({ navigation }) {
  const {
    users,
    loggedInUser,
    alterarUsuarioLogado,
    removerUsuario,
    fazerLogout,
  } = useContext(UserContext);

  const usuariosOrdenados = [...users].sort((a, b) => {
    const isAUsuarioLogado = a.id === loggedInUser?.id;
    const isBUsuarioLogado = b.id === loggedInUser?.id;

    if (isAUsuarioLogado && !isBUsuarioLogado) return -1;
    if (!isAUsuarioLogado && isBUsuarioLogado) return 1;

    return a.id - b.id;
  });

  return (
    <View style={styles.container}>
      <Text style={styles.description}>
        Clique em um usuário para mudar o usuário logado
      </Text>
      <FlatList
        data={usuariosOrdenados}
        keyExtractor={(user) => user.id.toString()}
        renderItem={({ item: user }) => (
          <TouchableOpacity
            style={styles.user}
            onPress={() => alterarUsuarioLogado(user.id)}
          >
            <View>
              <View>
                <Text
                  style={styles.nome}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.5}
                >
                  {user.nome}
                  {user.id === loggedInUser?.id && (
                    <Ionicons name="checkmark" size={16} />
                  )}
                </Text>
              </View>
              <Text style={styles.email}>{user.email}</Text>
            </View>

            {user.id !== loggedInUser?.id && (
              <TouchableOpacity
                style={styles.btnDelete}
                onPress={() =>
                  Alert.alert(
                    "Confirmar",
                    "Você tem certeza que deseja remover este usuário?",
                    [
                      {
                        text: "Cancelar",
                        style: "cancel",
                      },
                      {
                        text: "OK",
                        onPress: () => removerUsuario(user.id),
                      },
                    ],
                    { cancelable: true },
                  )
                }
              >
                <Ionicons name="trash" style={styles.btnText} size={20} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.btnExit}
        onPress={() =>
          Alert.alert(
            "Confirmar",
            "Você tem certeza que deseja sair?",
            [
              {
                text: "Cancelar",
                style: "cancel",
              },
              {
                text: "OK",
                onPress: () => {
                  fazerLogout();
                  navigation.reset({
                    index: 0,
                    routes: [{ name: "Login" }],
                  });
                },
              },
            ],
            { cancelable: true },
          )
        }
      >
        <Text style={styles.btnText}>Sair</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#f5f5f5" },
  description: { fontSize: 16, marginBottom: 10, color: "#333" },
  user: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
  },
  email: { color: "#665", marginTop: 4 },
  btnDelete: {
    backgroundColor: "#e74c3c",
    padding: 8,
    borderRadius: 5,
    marginTop: 5,
  },
  btnExit: {
    backgroundColor: "#e74c3c",
    padding: 8,
    borderRadius: 5,
    marginTop: 5,
  },
  btnText: { color: "#fff", fontWeight: "bold", textAlign: "center" },
});
