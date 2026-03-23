import { Hono } from "hono"
import { nanoid } from "nanoid"
import { getPool, sql } from "../db.js"

const app = new Hono()

// GET /api/projects — list user's projects
app.get("/", async (c) => {
  const userId = c.get("userId")
  const db = await getPool()
  const result = await db
    .request()
    .input("userId", sql.NVarChar(255), userId)
    .query(
      "SELECT id, name, user_id AS userId, created_at AS createdAt FROM projects WHERE user_id = @userId ORDER BY created_at"
    )
  return c.json(result.recordset)
})

// POST /api/projects — create project
app.post("/", async (c) => {
  const userId = c.get("userId")
  const { name } = await c.req.json<{ name: string }>()
  if (!name?.trim()) return c.json({ error: "Name is required" }, 400)

  const id = nanoid()
  const db = await getPool()
  await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("name", sql.NVarChar(255), name.trim())
    .input("userId", sql.NVarChar(255), userId)
    .query("INSERT INTO projects (id, name, user_id) VALUES (@id, @name, @userId)")

  const result = await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .query(
      "SELECT id, name, user_id AS userId, created_at AS createdAt FROM projects WHERE id = @id"
    )
  return c.json(result.recordset[0], 201)
})

// PATCH /api/projects/:id — rename project
app.patch("/:id", async (c) => {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const { name } = await c.req.json<{ name: string }>()
  if (!name?.trim()) return c.json({ error: "Name is required" }, 400)

  const db = await getPool()
  const result = await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("name", sql.NVarChar(255), name.trim())
    .input("userId", sql.NVarChar(255), userId)
    .query("UPDATE projects SET name = @name WHERE id = @id AND user_id = @userId")

  if (result.rowsAffected[0] === 0)
    return c.json({ error: "Not found" }, 404)

  return c.json({ id, name: name.trim() })
})

// DELETE /api/projects/:id — delete project (cascades columns + tasks)
app.delete("/:id", async (c) => {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const db = await getPool()
  const result = await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("userId", sql.NVarChar(255), userId)
    .query("DELETE FROM projects WHERE id = @id AND user_id = @userId")

  if (result.rowsAffected[0] === 0)
    return c.json({ error: "Not found" }, 404)

  return c.body(null, 204)
})

export default app
