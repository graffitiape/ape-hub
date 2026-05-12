import { useSyncExternalStore } from "react"

const GOOGLE_CREDENTIAL_KEY = "ape-hub-google-credential"
const GOOGLE_USER_KEY = "ape-hub-google-user"

export type GoogleAuthUser = {
  id: string
  name: string
  email: string
  picture?: string
  expiresAt: number
}

type GoogleCredentialPayload = {
  sub?: string
  name?: string
  email?: string
  picture?: string
  exp?: number
}

type GoogleAuthState = {
  credential: string | null
  user: GoogleAuthUser | null
}

const listeners = new Set<() => void>()

let state: GoogleAuthState = loadStoredState()

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot() {
  return state
}

function loadStoredState(): GoogleAuthState {
  const credential = localStorage.getItem(GOOGLE_CREDENTIAL_KEY)
  const rawUser = localStorage.getItem(GOOGLE_USER_KEY)
  if (!credential || !rawUser) return { credential: null, user: null }

  try {
    const user = JSON.parse(rawUser) as GoogleAuthUser
    if (isExpired(user.expiresAt)) {
      localStorage.removeItem(GOOGLE_CREDENTIAL_KEY)
      localStorage.removeItem(GOOGLE_USER_KEY)
      return { credential: null, user: null }
    }

    return { credential, user }
  } catch {
    localStorage.removeItem(GOOGLE_CREDENTIAL_KEY)
    localStorage.removeItem(GOOGLE_USER_KEY)
    return { credential: null, user: null }
  }
}

function isExpired(expiresAt: number) {
  return expiresAt <= Math.floor(Date.now() / 1000)
}

function decodeGoogleCredential(credential: string): GoogleCredentialPayload {
  const [, encodedPayload] = credential.split(".")
  if (!encodedPayload) throw new Error("Invalid Google credential")

  const base64 = encodedPayload.replace(/-/g, "+").replace(/_/g, "/")
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=")
  return JSON.parse(atob(padded)) as GoogleCredentialPayload
}

export function getGoogleClientId() {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID || ""
}

export function isGoogleAuthConfigured() {
  return getGoogleClientId().length > 0
}

export function setGoogleCredential(credential: string) {
  const payload = decodeGoogleCredential(credential)
  if (!payload.sub || !payload.exp) {
    throw new Error("Google did not return a complete credential")
  }

  const user: GoogleAuthUser = {
    id: payload.sub,
    name: payload.name || payload.email || "Google user",
    email: payload.email || "",
    picture: payload.picture,
    expiresAt: payload.exp,
  }

  localStorage.setItem(GOOGLE_CREDENTIAL_KEY, credential)
  localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(user))
  state = { credential, user }
  emit()
}

export function clearGoogleCredential() {
  localStorage.removeItem(GOOGLE_CREDENTIAL_KEY)
  localStorage.removeItem(GOOGLE_USER_KEY)
  state = { credential: null, user: null }
  window.google?.accounts.id.disableAutoSelect()
  emit()
}

export function getGoogleCredential() {
  if (!state.credential || !state.user) return null

  if (isExpired(state.user.expiresAt)) {
    clearGoogleCredential()
    return null
  }

  return state.credential
}

export function useGoogleAuth() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot)

  return {
    ...snapshot,
    isAuthenticated: !!snapshot.credential && !!snapshot.user,
    isConfigured: isGoogleAuthConfigured(),
  }
}
