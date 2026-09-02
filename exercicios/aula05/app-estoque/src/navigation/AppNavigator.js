import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useContext } from "react";

import { UserContext } from "../contexts/UserContext";
import Home from "../screens/Home";
import Inventory from "../screens/Inventory";
import EditProduct from "../screens/products/EditProduct";
import NewProduct from "../screens/products/NewProduct";
import User from "../screens/User";
import Login from "../screens/users/Login";
import Register from "../screens/users/Register";

const Tab = createBottomTabNavigator();
const RootStack = createNativeStackNavigator();
const InventoryStack = createNativeStackNavigator();

function InventoryNavigator() {
  return (
    <InventoryStack.Navigator>
      <InventoryStack.Screen
        name="InventoryList"
        component={Inventory}
        options={{ title: "Lista de Produtos" }}
      />
      <InventoryStack.Screen
        name="User"
        component={User}
        options={{ title: "Usuários" }}
      />
      <InventoryStack.Screen
        name="NewProduct"
        component={NewProduct}
        options={{ title: "Novo Produto" }}
      />
      <InventoryStack.Screen
        name="EditProduct"
        component={EditProduct}
        options={{ title: "Editar Produto" }}
      />
    </InventoryStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="Inventário"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") iconName = "home";
          else if (route.name === "Inventário") iconName = "list";
          else if (route.name === "Usuários") iconName = "people";
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen
        name="Inventário"
        component={InventoryNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Usuários" component={User} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { loggedInUser } = useContext(UserContext);

  return (
    <RootStack.Navigator
      initialRouteName={loggedInUser ? "Main" : "Login"}
      screenOptions={{ headerShown: false }}
    >
      <RootStack.Screen name="Login" component={Login} />
      <RootStack.Screen name="Register" component={Register} />
      <RootStack.Screen name="Main" component={MainTabs} />
    </RootStack.Navigator>
  );
}
