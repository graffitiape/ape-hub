import { Hono } from "hono"
import { getPool, sql } from "../db.js"

const app = new Hono()

// GET /api/projects/:projectId/board — bulk load project with columns and tasks
app.get("/projects/:projectId/board", async (c) => {
  const userId = c.get("userId")
  const { projectId } = c.req.param()
  const db = await getPool()

  // Get project (verify ownership)
  const projectResult = await db
    .request()
    .input("projectId", sql.NVarChar(21), projectId)
    .input("userId", sql.NVarChar(255), userId)
    .query(
      "SELECT id, name, user_id AS userId, is_favorite AS isFavorite, icon_name AS iconName, icon_color AS iconColor, created_at AS createdAt FROM projects WHERE id = @projectId AND user_id = @userId"
    )

  if (projectResult.recordset.length === 0)
    return c.json({ error: "Project not found" }, 404)

  const project = projectResult.recordset[0]

  // Get columns
  const columnsResult = await db
    .request()
    .input("projectId", sql.NVarChar(21), projectId)
    .query(
      "SELECT id, title, project_id AS projectId, sort_order AS [order] FROM columns WHERE project_id = @projectId ORDER BY sort_order"
    )

  // Get tasks for all columns in this project
  const tasksResult = await db
    .request()
    .input("projectId", sql.NVarChar(21), projectId)
    .query(`
      SELECT t.id, t.title, t.description, t.column_id AS columnId, t.sort_order AS [order], t.created_at AS createdAt
      FROM tasks t
      INNER JOIN columns c ON t.column_id = c.id
      WHERE c.project_id = @projectId
      ORDER BY t.sort_order
    `)

  return c.json({
    project,
    columns: columnsResult.recordset,
    tasks: tasksResult.recordset,
  })
})

export default app
