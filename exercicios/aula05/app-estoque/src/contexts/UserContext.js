import * as SQLite from "expo-sqlite";
import { createContext, useEffect, useState } from "react";
import { initDB } from "../database/database";
import { hashText } from "../util/hash";

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

  const adicionarUsuario = async (nome, email, senha) => {
    try {
      const db = await SQLite.openDatabaseAsync("bd_estoque.db");
      const result = await db.runAsync(
        "INSERT INTO tb_usuarios (nome, email, senha) VALUES (?, ?, ?)",
        [nome, email, await hashText(senha)],
      );
      carregarUsuarios();
      return result;
    } catch (err) {
      console.log("Erro ao adicionar usuário:", err);
    }
  };

  const removerUsuario = async (id) => {
    try {
      const db = await SQLite.openDatabaseAsync("bd_estoque.db");
      await db.runAsync("DELETE FROM tb_usuarios WHERE id = ?", [id]);
      carregarUsuarios();
    } catch (err) {
      console.log("Erro ao remover usuário:", err);
    }
  };

  const cadastrarUsuario = async (nome, email, senha) => {
    const result = await adicionarUsuario(nome, email, senha);
    setLoggedInUser({ result });
  };

  const fazerLogin = async (email, senha) => {
    try {
      const db = await SQLite.openDatabaseAsync("bd_estoque.db");
      const result = await db.getFirstAsync(
        "SELECT * FROM tb_usuarios WHERE email = ? AND senha = ?",
        [email, await hashText(senha)],
      );

      if (result) {
        setLoggedInUser(result);
        return true;
      }

      return false;
    } catch (err) {
      console.log("Erro ao fazer login:", err);
      return false;
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
        cadastrarUsuario,
        removerUsuario,
        fazerLogin,
        alterarUsuarioLogado,
        fazerLogout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};
