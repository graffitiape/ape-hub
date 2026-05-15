import { Hono } from "hono"
import { nanoid } from "nanoid"
import { getPool, sql } from "../db.js"

const app = new Hono()

const projectSelect = `
  SELECT
    id,
    name,
    user_id AS userId,
    CAST(is_favorite AS bit) AS isFavorite,
    icon_name AS iconName,
    icon_color AS iconColor,
    created_at AS createdAt
  FROM projects
`

function isValidHexColor(color: string) {
  return /^#[0-9a-fA-F]{6}$/.test(color)
}

// GET /api/projects — list user's projects
app.get("/", async (c) => {
  const userId = c.get("userId")
  const db = await getPool()
  const result = await db
    .request()
    .input("userId", sql.NVarChar(255), userId)
    .query(`${projectSelect} WHERE user_id = @userId ORDER BY is_favorite DESC, created_at`)
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
    .query(`${projectSelect} WHERE id = @id`)
  return c.json(result.recordset[0], 201)
})

// PATCH /api/projects/:id — update project
app.patch("/:id", async (c) => {
  const userId = c.get("userId")
  const { id } = c.req.param()
  const updates = await c.req.json<{
    name?: string
    isFavorite?: boolean
    iconName?: string
    iconColor?: string
  }>()

  const sets: string[] = []

  const db = await getPool()
  const request = db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("userId", sql.NVarChar(255), userId)

  if (updates.name !== undefined) {
    const name = updates.name.trim()
    if (!name) return c.json({ error: "Name is required" }, 400)

    sets.push("name = @name")
    request.input("name", sql.NVarChar(255), name)
  }

  if (updates.isFavorite !== undefined) {
    sets.push("is_favorite = @isFavorite")
    request.input("isFavorite", sql.Bit, updates.isFavorite)
  }

  if (updates.iconName !== undefined) {
    const iconName = updates.iconName.trim()
    if (!iconName || iconName.length > 64) {
      return c.json({ error: "Icon name is invalid" }, 400)
    }

    sets.push("icon_name = @iconName")
    request.input("iconName", sql.NVarChar(64), iconName)
  }

  if (updates.iconColor !== undefined) {
    const iconColor = updates.iconColor.trim()
    if (!isValidHexColor(iconColor)) {
      return c.json({ error: "Icon color must be a hex color" }, 400)
    }

    sets.push("icon_color = @iconColor")
    request.input("iconColor", sql.NVarChar(32), iconColor)
  }

  if (sets.length === 0) {
    return c.json({ error: "No fields to update" }, 400)
  }

  const result = await request.query(
    `UPDATE projects SET ${sets.join(", ")} WHERE id = @id AND user_id = @userId`
  )

  if (result.rowsAffected[0] === 0)
    return c.json({ error: "Not found" }, 404)

  const updated = await db
    .request()
    .input("id", sql.NVarChar(21), id)
    .input("userId", sql.NVarChar(255), userId)
    .query(`${projectSelect} WHERE id = @id AND user_id = @userId`)

  return c.json(updated.recordset[0])
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
