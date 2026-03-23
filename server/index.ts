import "dotenv/config"
import { Hono } from "hono"
import { serve } from "@hono/node-server"
import { serveStatic } from "@hono/node-server/serve-static"
import { logger } from "hono/logger"
import { cors } from "hono/cors"
import { authMiddleware } from "./middleware/auth.js"
import { ensureSchema } from "./db.js"
import projectsRouter from "./routes/projects.js"
import columnsRouter from "./routes/columns.js"
import tasksRouter from "./routes/tasks.js"
import boardRouter from "./routes/board.js"

const app = new Hono()

app.use("*", logger())
app.use("*", cors())

// API routes (all require auth)
app.use("/api/*", authMiddleware)
app.route("/api/projects", projectsRouter)
app.route("/api", columnsRouter)
app.route("/api", tasksRouter)
app.route("/api", boardRouter)

// In production, serve the built frontend
if (process.env.NODE_ENV === "production") {
  app.use("/*", serveStatic({ root: "./dist" }))
  app.get("*", serveStatic({ root: "./dist", path: "index.html" }))
}

const port = parseInt(process.env.PORT || "3001", 10)

async function start() {
  try {
    await ensureSchema()
    console.log(`[server] Schema initialized`)
  } catch (err) {
    console.error("[server] Failed to initialize schema:", err)
    process.exit(1)
  }

  serve({ fetch: app.fetch, port }, () => {
    console.log(`[server] Running on http://localhost:${port}`)
  })
}

start()
