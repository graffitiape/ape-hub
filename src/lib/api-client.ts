import type { IPublicClientApplication } from "@azure/msal-browser"
import { getPreferredAuthProvider } from "@/lib/auth-provider"
import { getGoogleCredential } from "@/lib/google-auth"

let msalInstance: IPublicClientApplication | null = null

const DEV_MODE = import.meta.env.VITE_DEV_MODE === "true"

export function initApiClient(instance: IPublicClientApplication) {
  msalInstance = instance
}

async function getToken(): Promise<string | null> {
  if (DEV_MODE || !msalInstance) return null

  const preferredProvider = getPreferredAuthProvider()
  const googleCredential = getGoogleCredential()
  const accounts = msalInstance.getAllAccounts()

  if (preferredProvider === "google") {
    return googleCredential
  }

  if (preferredProvider === "microsoft" || accounts.length > 0) {
    if (accounts.length === 0) return null

    const response = await msalInstance.acquireTokenSilent({
      scopes: [
        `api://${import.meta.env.VITE_AZURE_CLIENT_ID}/access_as_user`,
      ],
      account: accounts[0],
    })
    return response.accessToken
  }

  return googleCredential
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const token = await getToken()
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
    throw new Error(
      (err as { error?: string }).error || `Request failed: ${res.status}`
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
