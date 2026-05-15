export type AuthProvider = "google" | "microsoft"

const AUTH_PROVIDER_KEY = "ape-hub-auth-provider"

export function getPreferredAuthProvider(): AuthProvider | null {
  const provider = localStorage.getItem(AUTH_PROVIDER_KEY)
  return provider === "google" || provider === "microsoft" ? provider : null
}

export function setPreferredAuthProvider(provider: AuthProvider) {
  localStorage.setItem(AUTH_PROVIDER_KEY, provider)
}

export function clearPreferredAuthProvider(provider?: AuthProvider) {
  if (provider && getPreferredAuthProvider() !== provider) return
  localStorage.removeItem(AUTH_PROVIDER_KEY)
}
