import { useContext, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { UserContext } from "../../contexts/UserContext";

export default function Login({ navigation }) {
  const { fazerLogin } = useContext(UserContext);
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const salvar = async () => {
    if (!email || !senha) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    const sucesso = await fazerLogin(email, senha);

    if (sucesso) {
      navigation.reset({
        index: 0,
        routes: [{ name: "Main" }],
      });
      return;
    }

    Alert.alert("Erro", "Email ou senha inválidos.");
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Ex: joao.silva@example.com"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Senha</Text>
        <TextInput
          style={styles.input}
          value={senha}
          onChangeText={setSenha}
          placeholder="Ex: senha123"
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={salvar}>
          <Text style={styles.btnText}>Entrar</Text>
        </TouchableOpacity>

        <Text style={styles.link} onPress={() => navigation.navigate("Register")}>
          Não tem uma conta? Clique aqui para se cadastrar.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f5f5f5" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
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
  link: { color: "#1ac8d4", fontSize: 16, textAlign: "center", marginTop: 10 },
});
