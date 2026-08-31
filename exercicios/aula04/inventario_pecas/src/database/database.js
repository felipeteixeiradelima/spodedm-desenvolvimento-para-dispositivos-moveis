import * as SQLite from "expo-sqlite";

// No SDK 54, usamos openDatabaseAsync (assíncrono)
export const initDB = async () => {
  const db = await SQLite.openDatabaseAsync("techinventory.db");

  // Criar a tabela usando a nova API
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS pecas (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      nome TEXT, 
      categoria TEXT, 
      quantidade INTEGER, 
      serial TEXT, 
      imagemUri TEXT
    );
  `);

  // Verificar se a tabela está vazia para inserir dados de teste (mock data)
  const firstRowPecas = await db.getFirstAsync(
    "SELECT count(*) as count FROM pecas"
  );

  if (firstRowPecas && firstRowPecas.count === 0) {
    await db.runAsync(
      "INSERT INTO pecas (nome, categoria, quantidade, serial) VALUES (?, ?, ?, ?)",
      ["Placa de Vídeo RX 580", "Defeito/Sucata", 1, "SN-RX580-001"]
    );
    await db.runAsync(
      "INSERT INTO pecas (nome, categoria, quantidade, serial) VALUES (?, ?, ?, ?)",
      ["Capacitores de Tântalo", "Componentes PS3", 50, "SN-CAP-002"]
    );
  }

  await db.runAsync(`
      CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT NOT NULL,
        cpf TEXT NOT NULL,
        email TEXT NOT NULL
      )
    `);

  // Verificar se a tabela está vazia para inserir dados de teste (mock data)
  const firstRowClientes = await db.getFirstAsync(
    "SELECT count(*) as count FROM pecas"
  );

  if (firstRowClientes && firstRowClientes.count === 0) {
    await db.runAsync(
      "INSERT INTO clientes (nome, cpf, email) VALUES (?, ?, ?)",
      ["Felipe Teixeira de Lima", "520.876.720-16", "felipe.tlima@gmail.com"]
    );
    await db.runAsync(
      "INSERT INTO clientes (nome, cpf, email) VALUES (?, ?, ?)",
      ["Amanda Jen", "350.430.680-78", "jen.amandy@hotmail.com"]
    );
  }
};
