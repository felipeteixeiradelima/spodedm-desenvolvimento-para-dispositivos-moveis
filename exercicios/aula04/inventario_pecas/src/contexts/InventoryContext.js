import * as SQLite from "expo-sqlite";
import React, { createContext, useEffect, useState } from "react";
import { initDB } from "../database/database";

export const InventoryContext = createContext();

export const InventoryProvider = ({ children }) => {
  const [pecas, setPecas] = useState([]);
  const [clientes, setClientes] = useState([]);

  // Função para carregar os dados usando a nova API assíncrona do SDK 54
  const carregarPecas = async () => {
    try {
      const db = await SQLite.openDatabaseAsync("techinventory.db");
      const allRows = await db.getAllAsync("SELECT * FROM pecas");
      setPecas(allRows);
    } catch (err) {
      console.log("Erro ao carregar peças:", err);
    }
  };

  useEffect(() => {
    // Inicializa o banco e depois carrega os itens
    initDB()
      .then(() => carregarPecas())
      .catch((err) => console.log("Erro ao inicializar banco:", err));
  }, []);

  const adicionarPeca = async (
    nome,
    categoria,
    quantidade,
    serial,
    imagemUri
  ) => {
    try {
      const db = await SQLite.openDatabaseAsync("techinventory.db");
      await db.runAsync(
        "INSERT INTO pecas (nome, categoria, quantidade, serial, imagemUri) VALUES (?, ?, ?, ?, ?)",
        [nome, categoria, quantidade, serial, imagemUri]
      );
      carregarPecas(); // Atualiza a lista na UI
    } catch (err) {
      console.log("Erro ao inserir peça:", err);
    }
  };

  const editarPeca = async (id, quantidade) => {
    try {
      const db = await SQLite.openDatabaseAsync("techinventory.db");
      await db.runAsync("UPDATE pecas SET quantidade = ? WHERE id = ?", [
        quantidade,
        id,
      ]);
      carregarPecas(); // Atualiza a lista na UI
    } catch (err) {
      console.log("Erro ao editar peça:", err);
    }
  };

  const removerPeca = async (id) => {
    try {
      const db = await SQLite.openDatabaseAsync("techinventory.db");
      await db.runAsync("DELETE FROM pecas WHERE id = ?", [id]);
      carregarPecas(); // Atualiza a lista na UI
    } catch (err) {
      console.log("Erro ao remover peça:", err);
    }
  };

  // Função para carregar os clientes
  const carregarClientes = async () => {
    try {
      const db = await SQLite.openDatabaseAsync("techinventory.db");
      const allRows = await db.getAllAsync("SELECT * FROM clientes");
      setClientes(allRows);
    } catch (err) {
      console.log("Erro ao carregar clientes:", err);
    }
  };

  // Função para adicionar um cliente
  const adicionarCliente = async (nome, cpf, email) => {
    try {
      const db = await SQLite.openDatabaseAsync("techinventory.db");
      await db.runAsync(
        "INSERT INTO clientes (nome, cpf, email) VALUES (?, ?, ?)",
        [nome, cpf, email]
      );
      carregarClientes(); // Atualiza a lista na UI
    } catch (err) {
      console.log("Erro ao adicionar cliente:", err);
    }
  };

  const removerCliente = async (id) => {
    try {
      const db = await SQLite.openDatabaseAsync("techinventory.db");
      await db.runAsync("DELETE FROM clientes WHERE id = ?", [id]);
      carregarClientes(); // Atualiza a lista na UI
    } catch (err) {
      console.log("Erro ao remover cliente:", err);
    }
  };

  useEffect(() => {
    // Inicializa o banco e carrega os dados de clientes e peças
    initDB()
      .then(() => {
        carregarPecas();
        carregarClientes();
      })
      .catch((err) => console.log("Erro ao inicializar banco:", err));
  }, []);

  return (
    <InventoryContext.Provider
      value={{
        pecas,
        carregarPecas,
        adicionarPeca,
        editarPeca,
        removerPeca,
        clientes,
        carregarClientes,
        adicionarCliente,
        removerCliente,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};
