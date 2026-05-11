import { createRemoteJWKSet, jwtVerify } from "jose"
import type { Context, Next } from "hono"
import { upsertUser } from "../db.js"

declare module "hono" {
  interface ContextVariableMap {
    userId: string
    userName: string
    userEmail: string
  }
}

const DEV_MODE = process.env.DEV_MODE === "true"

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJWKS() {
  if (!jwks) {
    const tenantId = process.env.AZURE_TENANT_ID
    if (!tenantId) throw new Error("AZURE_TENANT_ID is required in production")
    jwks = createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
      )
    )
  }
  return jwks
}

function getAllowedAudiences() {
  const clientId = process.env.AZURE_CLIENT_ID
  if (!clientId) throw new Error("AZURE_CLIENT_ID is required in production")
  return [clientId, `api://${clientId}`]
}

export async function authMiddleware(c: Context, next: Next) {
  if (DEV_MODE) {
    const userId = "dev-user"
    const userName = "Developer"
    const userEmail = "dev@localhost"
    c.set("userId", userId)
    c.set("userName", userName)
    c.set("userEmail", userEmail)
    await upsertUser(userId, userName, userEmail)
    return next()
  }

  const authHeader = c.req.header("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
    const token = authHeader.slice(7)
    const { payload } = await jwtVerify(token, getJWKS(), {
      issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
      audience: getAllowedAudiences(),
    })

    const userId = payload.oid as string
    const userName = (payload.name as string) || "Unknown"
    const userEmail =
      (payload.preferred_username as string) || (payload.email as string) || ""

    c.set("userId", userId)
    c.set("userName", userName)
    c.set("userEmail", userEmail)

    await upsertUser(userId, userName, userEmail)
    return next()
  } catch {
    return c.json({ error: "Invalid token" }, 401)
  }
}
