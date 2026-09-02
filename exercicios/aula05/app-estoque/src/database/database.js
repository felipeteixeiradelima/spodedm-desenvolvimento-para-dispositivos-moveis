import * as SQLite from "expo-sqlite";
import { hashText } from "../util/hash.js";

export const initDB = async () => {
  const db = await SQLite.openDatabaseAsync("bd_estoque.db");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tb_produtos (
      codigo TEXT PRIMARY KEY, 
      nome TEXT, 
      quantidade INTEGER, 
      fornecedor TEXT
    );
  `);

  const firstRowProdutos = await db.getFirstAsync(
    "SELECT count(*) as count FROM tb_produtos",
  );

  if (firstRowProdutos && firstRowProdutos.count === 0) {
    await db.runAsync(
      "INSERT INTO tb_produtos (codigo, nome, quantidade, fornecedor) VALUES (?, ?, ?, ?)",
      ["7896238264474", "Placa de Vídeo RX 580", 1, "João Eletrônicos"],
    );
    await db.runAsync(
      "INSERT INTO tb_produtos (codigo, nome, quantidade, fornecedor) VALUES (?, ?, ?, ?)",
      ["7891211029033", "Carrinho Hot Wheels Roadster Bite", 10, "Mattel"],
    );
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tb_usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT,
      email TEXT UNIQUE, 
      senha TEXT
    );
  `);

  const firstRowUsuarios = await db.getFirstAsync(
    "SELECT count(*) as count FROM tb_usuarios",
  );

  if (firstRowUsuarios && firstRowUsuarios.count === 0) {
    await db.runAsync(
      "INSERT INTO tb_usuarios (nome, email, senha) VALUES (?, ?, ?)",
      ["Felipe Lima", "felipe.lima@gmail.com", await hashText("123456")],
    );
    await db.runAsync(
      "INSERT INTO tb_usuarios (nome, email, senha) VALUES (?, ?, ?)",
      ["Amanda Jen", "jen.amanda@gmail.com", await hashText("654321")],
    );
  }
};
