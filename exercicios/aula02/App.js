import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import Home from "./src/screens/Home";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        {/* Registrando a tela Home na pilha e definindo o título do cabeçalho */}
        <Stack.Screen
          name="Home"
          component={Home}
          options={{ title: "Meu App de Tarefas" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
