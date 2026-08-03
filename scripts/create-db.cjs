// Cria o database "imobipro" no projeto Neon (roda uma única vez).
// Uso: node scripts/create-db.cjs
const { Client } = require("pg");

const direct = process.env.DIRECT_URL || require("fs")
  .readFileSync(".env", "utf8")
  .match(/DIRECT_URL="([^"]+)"/)[1];

const adminUrl = direct.replace(/\/imobipro\?/, "/neondb?");

(async () => {
  const client = new Client({ connectionString: adminUrl });
  await client.connect();
  const exists = await client.query("SELECT 1 FROM pg_database WHERE datname = 'imobipro'");
  if (exists.rowCount > 0) {
    console.log("Database 'imobipro' já existe — nada a fazer.");
  } else {
    await client.query("CREATE DATABASE imobipro");
    console.log("Database 'imobipro' criado com sucesso no Neon.");
  }
  await client.end();
})().catch((e) => {
  console.error("Erro ao criar database:", e.message);
  process.exit(1);
});
