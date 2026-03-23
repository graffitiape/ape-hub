import sql from "mssql"
import { readFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const config: sql.config = {
  server: process.env.DB_SERVER || "localhost",
  database: process.env.DB_NAME || "ape-hub",
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "",
  port: parseInt(process.env.DB_PORT || "1433", 10),
  options: {
    encrypt: process.env.DB_ENCRYPT !== "false",
    trustServerCertificate: process.env.DB_TRUST_CERT === "true",
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
}

let pool: sql.ConnectionPool | null = null

export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    pool = await new sql.ConnectionPool(config).connect()
  }
  return pool
}

export async function ensureSchema(): Promise<void> {
  const db = await getPool()
  const schemaPath = resolve(__dirname, "schema.sql")
  const schemaSql = readFileSync(schemaPath, "utf-8")

  // Split on GO-like batches (each IF block) and execute sequentially
  const batches = schemaSql
    .split(/^END;\s*$/m)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
    .map((b) => b + "\nEND;")

  for (const batch of batches) {
    await db.request().query(batch)
  }

  console.log("[db] Schema ensured")
}

export async function upsertUser(
  id: string,
  name: string,
  email: string
): Promise<void> {
  const db = await getPool()
  await db
    .request()
    .input("id", sql.NVarChar(255), id)
    .input("name", sql.NVarChar(255), name)
    .input("email", sql.NVarChar(255), email)
    .query(`
      MERGE users AS target
      USING (SELECT @id AS id) AS source ON target.id = source.id
      WHEN MATCHED THEN
        UPDATE SET name = @name, email = @email, last_login = SYSUTCDATETIME()
      WHEN NOT MATCHED THEN
        INSERT (id, name, email) VALUES (@id, @name, @email);
    `)
}

export { sql }
