import { useContext, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { UserContext } from "../../contexts/UserContext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Register({ navigation }) {
  const { cadastrarUsuario } = useContext(UserContext);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");

  const salvar = () => {
    if (!nome || !email || !senha) {
      Alert.alert("Erro", "Preencha todos os campos.");
      return;
    }

    if (senha !== confirmarSenha) {
      Alert.alert("Erro", "As senhas não coincidem.");
      return;
    }

    cadastrarUsuario(nome, email, senha);
    Alert.alert("Sucesso", "Usuário cadastrado com sucesso!");
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Cadastro</Text>
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
        }}
      >
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          placeholder="Ex: João da Silva"
        />

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

        <Text style={styles.label}>Confirmar Senha</Text>
        <TextInput
          style={styles.input}
          value={confirmarSenha}
          onChangeText={setConfirmarSenha}
          placeholder="Ex: senha123"
          secureTextEntry
        />

        <TouchableOpacity style={styles.btn} onPress={salvar}>
          <Text style={styles.btnText}>Cadastrar</Text>
        </TouchableOpacity>

        <Text style={styles.link} onPress={() => navigation.navigate("Login")}>
          Já tem uma conta? Clique aqui para fazer login.
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
