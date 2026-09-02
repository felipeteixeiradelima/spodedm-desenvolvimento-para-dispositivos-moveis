import * as SQLite from "expo-sqlite";
import React, { createContext, useEffect, useState } from "react";
import { initDB } from "../database/database";

export const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [produtos, setProdutos] = useState([]);

  const carregarProdutos = async () => {
    try {
      const db = await SQLite.openDatabaseAsync("bd_estoque.db");
      const allRows = await db.getAllAsync("SELECT * FROM tb_produtos");
      setProdutos(allRows);
    } catch (err) {
      console.log("Erro ao carregar produtos:", err);
    }
  };

  const adicionarProduto = async (codigo, nome, quantidade, fornecedor) => {
    try {
      const db = await SQLite.openDatabaseAsync("bd_estoque.db");
      await db.runAsync(
        "INSERT INTO produtos (codigo, nome, quantidade, fornecedor) VALUES (?, ?, ?, ?)",
        [codigo, nome, quantidade, fornecedor]
      );
      carregarProdutos();
    } catch (err) {
      console.log("Erro ao inserir produto:", err);
    }
  };

  const editarProduto = async (codigo, nome, quantidade, fornecedor) => {
    try {
      const db = await SQLite.openDatabaseAsync("bd_estoque.db");
      await db.runAsync(
        "UPDATE produtos SET nome = ?, quantidade = ?, fornecedor = ? WHERE codigo = ?",
        [codigo, nome, quantidade, fornecedor]
      );
      carregarProdutos();
    } catch (err) {
      console.log("Erro ao editar produto:", err);
    }
  };

  const removerProduto = async (codigo) => {
    try {
      const db = await SQLite.openDatabaseAsync("bd_estoque.db");
      await db.runAsync("DELETE FROM tb_produtos WHERE codigo = ?", [codigo]);
      carregarProdutos();
    } catch (err) {
      console.log("Erro ao remover produto:", err);
    }
  };

  useEffect(() => {
    initDB()
      .then(() => {
        carregarProdutos();
      })
      .catch((err) => console.log("Erro ao inicializar banco:", err));
  }, []);

  return (
    <InventoryContext.Provider
      value={{
        produtos,
        carregarProdutos,
        adicionarProduto,
        editarProduto,
        removerProduto,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};
