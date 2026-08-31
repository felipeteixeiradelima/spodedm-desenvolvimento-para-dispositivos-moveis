import * as SQLite from "expo-sqlite";

export const initDB = async () => {
  const db = await SQLite.openDatabaseAsync("bd_estoque.db");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS tb_produtos (
      codigo TEXT PRIMARY KEY, 
      nome TEXT, 
      quantidade INTEGER, 
      fornecedor TEXT, 
    );
  `);

  const firstRowProdutos = await db.getFirstAsync(
    "SELECT count(*) as count FROM tb_produtos"
  );

  if (firstRowProdutos && firstRowProdutos.count === 0) {
    await db.runAsync(
      "INSERT INTO produtos (codigo, nome, quantidade, fornecedor) VALUES (?, ?, ?, ?)",
      ["7896238264474", "Placa de Vídeo RX 580", 1, "João Eletrônicos"]
    );
    await db.runAsync(
      "INSERT INTO produtos (codigo, nome, quantidade, fornecedor) VALUES (?, ?, ?, ?)",
      ["7891211029033", "Carrinho Hot Wheels Roadster Bite", 10, "Mattel"]
    );
  }
};
