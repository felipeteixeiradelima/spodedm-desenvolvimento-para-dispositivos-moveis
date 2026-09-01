import * as SQLite from "expo-sqlite";
import { createContext, useEffect, useState } from "react";
import { initDB } from "../database/database";

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [loggedInUser, setLoggedInUser] = useState(null);
  ("");

  const carregarUsuarios = async () => {
    try {
      const db = await SQLite.openDatabaseAsync("bd_estoque.db");
      const allRows = await db.getAllAsync("SELECT * FROM tb_usuarios");
      setUsers(allRows);
    } catch (err) {
      console.log("Erro ao carregar usuários:", err);
    }
  };

  const fazerLogin = async (email, senha) => {
    try {
      const db = await SQLite.openDatabaseAsync("bd_estoque.db");
      const result = await db.getFirstAsync(
        "SELECT * FROM tb_usuarios WHERE email = ? AND senha = ?",
        [email, senha],
      );
      if (result) {
        setLoggedInUser(result);
      }
      navigation.navigate("Home");
    } catch (err) {
      console.log("Erro ao fazer login:", err);
    }
  };

  const alterarUsuarioLogado = async (id) => {
    try {
      const db = await SQLite.openDatabaseAsync("bd_estoque.db");
      const result = await db.getFirstAsync(
        "SELECT * FROM tb_usuarios WHERE id = ?",
        [id],
      );
      if (result) {
        setLoggedInUser(result);
      }
    } catch (err) {
      console.log("Erro ao alterar usuário logado:", err);
    }
  };

  const fazerLogout = () => {
    setLoggedInUser(null);
    navigation.navigate("Login");
  };

  useEffect(() => {
    initDB()
      .then(() => carregarUsuarios())
      .catch((err) => console.log("Erro ao inicializar banco:", err));
  }, []);

  return (
    <UserContext.Provider
      value={{
        users,
        loggedInUser,
        carregarUsuarios,
        fazerLogin,
        alterarUsuarioLogado,
        fazerLogout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
