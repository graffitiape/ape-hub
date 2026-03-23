import { Hono } from "hono"
import { nanoid } from "nanoid"
import { getPool, sql } from "../db.js"

const app = new Hono()

// POST /api/columns/:columnId/tasks — create task
app.post("/columns/:columnId/tasks", async (c) => {
  const userId = c.get("userId")
  const { columnId } = c.req.param()
  const { title, description = "" } = await c.req.json<{
    title: string
    description?: string
  }>()
  if (!title?.trim()) return c.json({ error: "Title is required" }, 400)

  const db = await getPool()

  // Verify column ownership through project
  const col = await db
    .request()
    .input("columnId", sql.NVarChar(21), columnId)
    .input("userId", sql.NVarChar(255), userId)
    .query(`
      SELECT c.id FROM columns c
      INNER JOIN projects p ON c.project_id = p.id
      WHERE c.id = @columnId AND p.user_id = @userId
    `)
  if (col.recordset.length === 0)
    return c.json({ error: "Column not found" }, 404)

  // Get max sort_order
  const maxOrder = await db
    .request()
    .input("columnId", sql.NVarChar(21), columnId)
    .query(
      "SELECT ISNULL(MAX(sort_order), -1) AS maxOrder FROM tasks WHERE column_id = @columnId"
    )

  const id = nanoid()
  const order = (maxOrder.recordset[0].maxOrder as number) + 1

  await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("title", sql.NVarChar(255), title.trim())
    .input("description", sql.NVarChar(sql.MAX), description)
    .input("columnId", sql.NVarChar(21), columnId)
    .input("order", sql.Int, order)
    .query(
      "INSERT INTO tasks (id, title, description, column_id, sort_order) VALUES (@id, @title, @description, @columnId, @order)"
    )

  const result = await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .query(
      "SELECT id, title, description, column_id AS columnId, sort_order AS [order], created_at AS createdAt FROM tasks WHERE id = @id"
    )

  return c.json(result.recordset[0], 201)
})

// PATCH /api/tasks/:id — update task
app.patch("/tasks/:id", async (c) => {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const updates = await c.req.json<{
    title?: string
    description?: string
  }>()

  const db = await getPool()

  // Build dynamic SET clause
  const sets: string[] = []
  const request = db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("userId", sql.NVarChar(255), userId)

  if (updates.title !== undefined) {
    sets.push("t.title = @title")
    request.input("title", sql.NVarChar(255), updates.title.trim())
  }
  if (updates.description !== undefined) {
    sets.push("t.description = @description")
    request.input("description", sql.NVarChar(sql.MAX), updates.description)
  }

  if (sets.length === 0) return c.json({ error: "No fields to update" }, 400)

  const result = await request.query(`
    UPDATE t SET ${sets.join(", ")}
    FROM tasks t
    INNER JOIN columns c ON t.column_id = c.id
    INNER JOIN projects p ON c.project_id = p.id
    WHERE t.id = @id AND p.user_id = @userId
  `)

  if (result.rowsAffected[0] === 0)
    return c.json({ error: "Not found" }, 404)

  return c.json({ id, ...updates })
})

// DELETE /api/tasks/:id — delete task
app.delete("/tasks/:id", async (c) => {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const db = await getPool()
  const result = await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("userId", sql.NVarChar(255), userId)
    .query(`
      DELETE t FROM tasks t
      INNER JOIN columns c ON t.column_id = c.id
      INNER JOIN projects p ON c.project_id = p.id
      WHERE t.id = @id AND p.user_id = @userId
    `)

  if (result.rowsAffected[0] === 0)
    return c.json({ error: "Not found" }, 404)

  return c.body(null, 204)
})

// PUT /api/tasks/:id/move — move task to another column
app.put("/tasks/:id/move", async (c) => {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const { columnId, order } = await c.req.json<{
    columnId: string
    order: number
  }>()

  const db = await getPool()
  const result = await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("columnId", sql.NVarChar(21), columnId)
    .input("order", sql.Int, order)
    .input("userId", sql.NVarChar(255), userId)
    .query(`
      UPDATE t SET t.column_id = @columnId, t.sort_order = @order
      FROM tasks t
      INNER JOIN columns c ON t.column_id = c.id
      INNER JOIN projects p ON c.project_id = p.id
      WHERE t.id = @id AND p.user_id = @userId
    `)

  if (result.rowsAffected[0] === 0)
    return c.json({ error: "Not found" }, 404)

  return c.json({ id, columnId, order })
})

// PUT /api/columns/:columnId/tasks/order — reorder tasks in a column
app.put("/columns/:columnId/tasks/order", async (c) => {
  const userId = c.get("userId")
  const { columnId } = c.req.param()
  const { orderedIds } = await c.req.json<{ orderedIds: string[] }>()
  if (!Array.isArray(orderedIds))
    return c.json({ error: "orderedIds array is required" }, 400)

  const db = await getPool()

  // Verify column ownership
  const col = await db
    .request()
    .input("columnId", sql.NVarChar(21), columnId)
    .input("userId", sql.NVarChar(255), userId)
    .query(`
      SELECT c.id FROM columns c
      INNER JOIN projects p ON c.project_id = p.id
      WHERE c.id = @columnId AND p.user_id = @userId
    `)
  if (col.recordset.length === 0)
    return c.json({ error: "Column not found" }, 404)

  const transaction = new sql.Transaction(db)
  await transaction.begin()
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await new sql.Request(transaction)
        .input("id", sql.NVarChar(21), orderedIds[i])
        .input("columnId", sql.NVarChar(21), columnId)
        .input("order", sql.Int, i)
        .query(
          "UPDATE tasks SET sort_order = @order WHERE id = @id AND column_id = @columnId"
        )
    }
    await transaction.commit()
  } catch (err) {
    await transaction.rollback()
    throw err
  }

  return c.json({ ok: true })
})

export default app
