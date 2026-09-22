import { SQLiteProvider } from "expo-sqlite";
import React, { useState } from "react";
import { Button, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { initializeDatabase } from "./src/database/initializeDatabase.ts";
import { Home } from "./src/screens/Home";
import { Settings } from "./src/screens/Settings";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<"Home" | "Settings">(
    "Home"
  );

  return (
    <View>
      <View style={styles.loading}>
        <Text>Carregando Banco de Dados...</Text>
      </View>
      <SQLiteProvider databaseName="walletx.db" onInit={initializeDatabase}>
        <SafeAreaView style={styles.container}>
          {currentScreen === "Home" ? <Home /> : <Settings />}
          <View style={styles.navBar}>
            <Button
              title="Gastos (SQLite)"
              color={currentScreen === "Home" ? "#2196F3" : "gray"}
              onPress={() => setCurrentScreen("Home")}
            />
            <Button
              title="Perfil (AsyncStorage)"
              color={currentScreen === "Settings" ? "#2196F3" : "gray"}
              onPress={() => setCurrentScreen("Settings")}
            />
          </View>
        </SafeAreaView>
      </SQLiteProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", paddingTop: 40 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ccc",
  },
});
