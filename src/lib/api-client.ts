import type { IPublicClientApplication } from "@azure/msal-browser"
import { getPreferredAuthProvider } from "@/lib/auth-provider"
import { getGoogleCredential } from "@/lib/google-auth"
import { requestGoogleCredentialRefresh } from "@/lib/google-identity"

let msalInstance: IPublicClientApplication | null = null

const DEV_MODE = import.meta.env.VITE_DEV_MODE === "true"
const GOOGLE_API_TOKEN_MIN_LIFETIME_SECONDS = 5 * 60

export function initApiClient(instance: IPublicClientApplication) {
  msalInstance = instance
}

async function getGoogleApiToken(forceRefresh: boolean) {
  if (forceRefresh) {
    await requestGoogleCredentialRefresh((message) => console.warn(message))
  }

  let credential = getGoogleCredential(GOOGLE_API_TOKEN_MIN_LIFETIME_SECONDS)
  if (credential) return credential

  await requestGoogleCredentialRefresh((message) => console.warn(message))
  credential = getGoogleCredential(GOOGLE_API_TOKEN_MIN_LIFETIME_SECONDS)
  return credential
}

async function getToken(forceRefresh = false): Promise<string | null> {
  if (DEV_MODE || !msalInstance) return null

  const preferredProvider = getPreferredAuthProvider()
  const accounts = msalInstance.getAllAccounts()

  if (preferredProvider === "google") {
    return getGoogleApiToken(forceRefresh)
  }

  if (preferredProvider === "microsoft" || accounts.length > 0) {
    if (accounts.length === 0) return null

    const response = await msalInstance.acquireTokenSilent({
      scopes: [
        `api://${import.meta.env.VITE_AZURE_CLIENT_ID}/access_as_user`,
      ],
      account: accounts[0],
      forceRefresh,
    })
    return response.accessToken
  }

  return getGoogleApiToken(forceRefresh)
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  forceRefresh = false
): Promise<T> {
  const token = await getToken(forceRefresh)
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    const message =
      (err as { error?: string }).error || `Request failed: ${res.status}`

    if (
      res.status === 401 &&
      !forceRefresh &&
      (message === "Invalid token" || message === "Unauthorized")
    ) {
      return request<T>(method, path, body, true)
    }

    throw new Error(
      message
    )
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  delete: (path: string) => request<void>("DELETE", path),
}
