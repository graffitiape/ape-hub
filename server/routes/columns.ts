import { Hono } from "hono"
import { nanoid } from "nanoid"
import { getPool, sql } from "../db.js"

const app = new Hono()

// POST /api/projects/:projectId/columns — create column
app.post("/projects/:projectId/columns", async (c) => {
  const userId = c.get("userId")
  const { projectId } = c.req.param()
  const { title } = await c.req.json<{ title: string }>()
  if (!title?.trim()) return c.json({ error: "Title is required" }, 400)

  const db = await getPool()

  // Verify project ownership
  const project = await db
    .request()
    .input("projectId", sql.NVarChar(21), projectId)
    .input("userId", sql.NVarChar(255), userId)
    .query("SELECT id FROM projects WHERE id = @projectId AND user_id = @userId")
  if (project.recordset.length === 0)
    return c.json({ error: "Project not found" }, 404)

  // Get max sort_order
  const maxOrder = await db
    .request()
    .input("projectId", sql.NVarChar(21), projectId)
    .query(
      "SELECT ISNULL(MAX(sort_order), -1) AS maxOrder FROM columns WHERE project_id = @projectId"
    )

  const id = nanoid()
  const order = (maxOrder.recordset[0].maxOrder as number) + 1

  await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("title", sql.NVarChar(255), title.trim())
    .input("projectId", sql.NVarChar(21), projectId)
    .input("order", sql.Int, order)
    .query(
      "INSERT INTO columns (id, title, project_id, sort_order) VALUES (@id, @title, @projectId, @order)"
    )

  return c.json(
    { id, title: title.trim(), projectId, order },
    201
  )
})

// PATCH /api/columns/:id — rename column
app.patch("/columns/:id", async (c) => {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const { title } = await c.req.json<{ title: string }>()
  if (!title?.trim()) return c.json({ error: "Title is required" }, 400)

  const db = await getPool()
  const result = await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("title", sql.NVarChar(255), title.trim())
    .input("userId", sql.NVarChar(255), userId)
    .query(`
      UPDATE c SET c.title = @title
      FROM columns c
      INNER JOIN projects p ON c.project_id = p.id
      WHERE c.id = @id AND p.user_id = @userId
    `)

  if (result.rowsAffected[0] === 0)
    return c.json({ error: "Not found" }, 404)

  return c.json({ id, title: title.trim() })
})

// DELETE /api/columns/:id — delete column (cascades tasks)
app.delete("/columns/:id", async (c) => {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const db = await getPool()
  const result = await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("userId", sql.NVarChar(255), userId)
    .query(`
      DELETE c FROM columns c
      INNER JOIN projects p ON c.project_id = p.id
      WHERE c.id = @id AND p.user_id = @userId
    `)

  if (result.rowsAffected[0] === 0)
    return c.json({ error: "Not found" }, 404)

  return c.body(null, 204)
})

// PUT /api/projects/:projectId/columns/order — reorder columns
app.put("/projects/:projectId/columns/order", async (c) => {
  const userId = c.get("userId")
  const { projectId } = c.req.param()
  const { orderedIds } = await c.req.json<{ orderedIds: string[] }>()
  if (!Array.isArray(orderedIds))
    return c.json({ error: "orderedIds array is required" }, 400)

  const db = await getPool()

  // Verify project ownership
  const project = await db
    .request()
    .input("projectId", sql.NVarChar(21), projectId)
    .input("userId", sql.NVarChar(255), userId)
    .query("SELECT id FROM projects WHERE id = @projectId AND user_id = @userId")
  if (project.recordset.length === 0)
    return c.json({ error: "Project not found" }, 404)

  // Update sort_order for each column
  const transaction = new sql.Transaction(db)
  await transaction.begin()
  try {
    for (let i = 0; i < orderedIds.length; i++) {
      await new sql.Request(transaction)
        .input("id", sql.NVarChar(21), orderedIds[i])
        .input("projectId", sql.NVarChar(21), projectId)
        .input("order", sql.Int, i)
        .query(
          "UPDATE columns SET sort_order = @order WHERE id = @id AND project_id = @projectId"
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
