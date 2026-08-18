import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Importação das telas
import Home from "./src/screens/Home";
import NovoRegistro from "./src/screens/NovoRegistro";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen
          name="Home"
          component={Home}
          options={{ title: "Diário de Bordo" }}
        />
        <Stack.Screen
          name="NovoRegistro"
          component={NovoRegistro}
          options={{ title: "Novo Registro" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
