import { NavigationContainer } from "@react-navigation/native";
import { StyleSheet } from "react-native";
import { InventoryProvider } from "./src/contexts/InventoryContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <InventoryProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </InventoryProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
