import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Location from "expo-location";
import { CameraView, useCameraPermissions } from "expo-camera";

export default function NovoRegistro({ navigation }) {
  const [nome, setNome] = useState("");
  const [localizacao, setLocalizacao] = useState(null);
  const [codigo, setCodigo] = useState("");

  // Controle da Câmera
  const [isScanning, setIsScanning] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const obterLocalizacao = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Erro", "Permissão de localização negada.");
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({});
      setLocalizacao({
        latitude: loc.coords.latitude.toFixed(5),
        longitude: loc.coords.longitude.toFixed(5),
      });
      Alert.alert("Sucesso", "Localização capturada!");
    } catch (error) {
      Alert.alert("Erro", "Não foi possível obter a localização.");
    }
  };

  const abrirCamera = async () => {
    if (!permission?.granted) {
      const req = await requestPermission();
      if (!req.granted) {
        Alert.alert("Erro", "Permissão de câmera negada.");
        return;
      }
    }
    setIsScanning(true);
  };

  const salvarRegistro = async () => {
    if (!nome || !localizacao) {
      Alert.alert(
        "Aviso",
        "Preencha o nome e capture a localização antes de salvar."
      );
      return;
    }

    const novoLocal = {
      nome,
      latitude: localizacao.latitude,
      longitude: localizacao.longitude,
      codigo,
    };

    try {
      // 1. Ler o array atual
      const dadosAtuais = await AsyncStorage.getItem("@diario_locais");
      const lista = dadosAtuais ? JSON.parse(dadosAtuais) : [];

      // 2. Anexar o novo objeto
      lista.push(novoLocal);

      // 3. Persistir no AsyncStorage
      await AsyncStorage.setItem("@diario_locais", JSON.stringify(lista));

      // 4. Retornar
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erro", "Falha ao salvar os dados.");
    }
  };

  // Se a câmera estiver aberta, renderiza a tela de leitura
  if (isScanning) {
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={StyleSheet.absoluteFillObject}
          barcodeScannerSettings={{
            barcodeTypes: ["qr", "ean13", "ean8", "code128"],
          }}
          onBarcodeScanned={({ data }) => {
            setCodigo(data);
            setIsScanning(false);
            Alert.alert("Código Capturado!", data);
          }}
        />
        <TouchableOpacity
          style={styles.btnCancelar}
          onPress={() => setIsScanning(false)}
        >
          <Text style={styles.btnCancelarText}>Cancelar Leitura</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Renderização do formulário normal
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nome do Local"
        value={nome}
        onChangeText={setNome}
      />

      <TouchableOpacity style={styles.btnSecundario} onPress={obterLocalizacao}>
        <Text style={styles.btnSecundarioText}>📍 Obter Minha Localização</Text>
      </TouchableOpacity>
      {localizacao && (
        <Text style={styles.infoText}>
          Latitude: {localizacao.latitude} | Longitude: {localizacao.longitude}
        </Text>
      )}

      <TouchableOpacity style={styles.btnSecundario} onPress={abrirCamera}>
        <Text style={styles.btnSecundarioText}>📷 Ler Código (Câmera)</Text>
      </TouchableOpacity>
      {codigo ? <Text style={styles.infoText}>Código: {codigo}</Text> : null}

      <TouchableOpacity style={styles.btnPrimario} onPress={salvarRegistro}>
        <Text style={styles.btnPrimarioText}>Salvar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#F5F5F7",
    gap: 12,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E5EA",
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
  },
  btnSecundario: {
    backgroundColor: "#E5E5EA",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  btnSecundarioText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
  },
  infoText: {
    textAlign: "center",
    color: "#8E8E93",
    fontSize: 14,
    marginBottom: 8,
  },
  btnPrimario: {
    backgroundColor: "#34C759",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 16,
  },
  btnPrimarioText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  cameraContainer: {
    flex: 1,
    justifyContent: "flex-end",
  },
  btnCancelar: {
    backgroundColor: "#FF3B30",
    padding: 16,
    alignItems: "center",
    marginBottom: 40,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  btnCancelarText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
