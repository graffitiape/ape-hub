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

let microsoftJwks: ReturnType<typeof createRemoteJWKSet> | null = null
let googleJwks: ReturnType<typeof createRemoteJWKSet> | null = null
const userUpsertTimes = new Map<string, number>()
const USER_UPSERT_INTERVAL_MS = 10 * 60 * 1000

type AuthenticatedUser = {
  id: string
  name: string
  email: string
}

function getMicrosoftJWKS() {
  if (!microsoftJwks) {
    const tenantId = process.env.AZURE_TENANT_ID
    if (!tenantId) throw new Error("AZURE_TENANT_ID is required in production")
    microsoftJwks = createRemoteJWKSet(
      new URL(
        `https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`
      )
    )
  }
  return microsoftJwks
}

function getGoogleJWKS() {
  if (!googleJwks) {
    googleJwks = createRemoteJWKSet(
      new URL("https://www.googleapis.com/oauth2/v3/certs")
    )
  }
  return googleJwks
}

function getAllowedAudiences() {
  const clientId = process.env.AZURE_CLIENT_ID
  if (!clientId) throw new Error("AZURE_CLIENT_ID is required in production")
  return [clientId, `api://${clientId}`]
}

async function verifyMicrosoftToken(token: string): Promise<AuthenticatedUser> {
  const { payload } = await jwtVerify(token, getMicrosoftJWKS(), {
    issuer: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/v2.0`,
    audience: getAllowedAudiences(),
  })

  const userId = payload.oid as string
  const userName = (payload.name as string) || "Unknown"
  const userEmail =
    (payload.preferred_username as string) || (payload.email as string) || ""

  if (!userId) throw new Error("Microsoft token is missing oid")

  return {
    id: userId,
    name: userName,
    email: userEmail,
  }
}

async function verifyGoogleToken(token: string): Promise<AuthenticatedUser> {
  const clientId = process.env.GOOGLE_CLIENT_ID
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID is required for Google login")

  const { payload } = await jwtVerify(token, getGoogleJWKS(), {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  })

  const googleId = payload.sub
  if (!googleId) throw new Error("Google token is missing sub")

  return {
    id: `google:${googleId}`,
    name: (payload.name as string) || (payload.email as string) || "Google user",
    email: (payload.email as string) || "",
  }
}

async function verifyToken(token: string): Promise<AuthenticatedUser> {
  try {
    return await verifyMicrosoftToken(token)
  } catch {
    return verifyGoogleToken(token)
  }
}

async function upsertUserIfNeeded(user: AuthenticatedUser) {
  const now = Date.now()
  const lastUpsertAt = userUpsertTimes.get(user.id) ?? 0
  if (now - lastUpsertAt < USER_UPSERT_INTERVAL_MS) return

  await upsertUser(user.id, user.name, user.email)
  userUpsertTimes.set(user.id, now)
}

export async function authMiddleware(c: Context, next: Next) {
  if (DEV_MODE) {
    const userId = "dev-user"
    const userName = "Developer"
    const userEmail = "dev@localhost"
    c.set("userId", userId)
    c.set("userName", userName)
    c.set("userEmail", userEmail)
    await upsertUserIfNeeded({ id: userId, name: userName, email: userEmail })
    return next()
  }

  const authHeader = c.req.header("Authorization")
  if (!authHeader?.startsWith("Bearer ")) {
    return c.json({ error: "Unauthorized" }, 401)
  }

  try {
    const token = authHeader.slice(7)
    const user = await verifyToken(token)

    c.set("userId", user.id)
    c.set("userName", user.name)
    c.set("userEmail", user.email)

    await upsertUserIfNeeded(user)
    return next()
  } catch {
    return c.json({ error: "Invalid token" }, 401)
  }
}
