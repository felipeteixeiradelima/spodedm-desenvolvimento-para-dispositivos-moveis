import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import EditProduct from "../screens/EditProduct";
import Home from "../screens/Home";
import Inventory from "../screens/Inventory";
import NewProduct from "../screens/NewProduct";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function InventoryStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="InventoryList"
        component={Inventory}
        options={{ title: "Lista de Produtos" }}
      />
      <Stack.Screen
        name="NewProduct"
        component={NewProduct}
        options={{ title: "Novo Produto" }}
      />
      <Stack.Screen
        name="EditProduct"
        component={EditProduct}
        options={{ title: "Editar Produto" }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = "home";
          else if (route.name === "Inventário") iconName = "list";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen
        name="Inventário"
        component={InventoryStack}
        options={{ headerShown: false }}
      />
    </Tab.Navigator>
  );
}
