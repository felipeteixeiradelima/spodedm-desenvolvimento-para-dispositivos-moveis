import { NavigationContainer } from "@react-navigation/native";
import { StyleSheet } from "react-native";
import { InventoryProvider } from "./src/contexts/InventoryContext";
import { UserProvider } from "./src/contexts/UserContext";
import AppNavigator from "./src/navigation/AppNavigator";

export default function App() {
  return (
    <UserProvider>
      <InventoryProvider>
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
      </InventoryProvider>
    </UserProvider>
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
