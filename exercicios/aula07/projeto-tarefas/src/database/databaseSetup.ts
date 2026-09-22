import { SQLiteDatabase } from "expo-sqlite";

export async function initDb(db: SQLiteDatabase) {
  // Exercício 9:
  const { user_version: currentDbVersion } = (await db.getFirstAsync<{
    user_version: number;
  }>("PRAGMA user_version")) ?? { user_version: 0 };

  // Exercício 3:
  if (currentDbVersion === 0) {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS tarefas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        concluida INTEGER DEFAULT 0
      );
    `);
    await db.execAsync("PRAGMA user_version = 1");
  }

  // Exercício 9:
  if (currentDbVersion === 1) {
    await db.execAsync(`
      ALTER TABLE tarefas ADD COLUMN data_criacao TEXT;
    `);
    await db.execAsync("PRAGMA user_version = 2");
  }
}
