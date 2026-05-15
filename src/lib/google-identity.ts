import {
  getGoogleClientId,
  setGoogleCredential,
} from "@/lib/google-auth"

const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client"

type GoogleCredentialResponse = {
  credential?: string
}

type GoogleIdConfiguration = {
  client_id: string
  callback: (response: GoogleCredentialResponse) => void
  auto_select?: boolean
  cancel_on_tap_outside?: boolean
}

type GoogleButtonConfiguration = {
  theme?: "outline" | "filled_blue" | "filled_black"
  size?: "large" | "medium" | "small"
  text?: "signin_with" | "signup_with" | "continue_with" | "signin"
  shape?: "rectangular" | "pill" | "circle" | "square"
  logo_alignment?: "left" | "center"
  width?: number
}

let scriptPromise: Promise<void> | null = null

function loadGoogleIdentityScript() {
  if (window.google?.accounts.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GOOGLE_IDENTITY_SCRIPT}"]`
    )

    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener("error", () => reject(new Error("Google sign-in failed to load")), {
        once: true,
      })
      return
    }

    const script = document.createElement("script")
    script.src = GOOGLE_IDENTITY_SCRIPT
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Google sign-in failed to load"))
    document.head.append(script)
  })

  return scriptPromise
}

export async function renderGoogleSignInButton(
  container: HTMLElement,
  onError: (message: string) => void
) {
  const clientId = getGoogleClientId()
  if (!clientId) {
    onError("Google sign-in is not configured")
    return
  }

  await loadGoogleIdentityScript()

  window.google?.accounts.id.initialize({
    client_id: clientId,
    auto_select: false,
    cancel_on_tap_outside: true,
    callback: (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        onError("Google did not return a credential")
        return
      }

      try {
        setGoogleCredential(response.credential)
      } catch (err) {
        onError(err instanceof Error ? err.message : "Google login failed")
      }
    },
  })

  container.innerHTML = ""
  window.google?.accounts.id.renderButton(container, {
    theme: "outline",
    size: "large",
    text: "signin_with",
    shape: "rectangular",
    logo_alignment: "left",
    width: Math.max(320, Math.floor(container.getBoundingClientRect().width)),
  })
}

export async function requestGoogleCredentialRefresh(
  onError?: (message: string) => void
) {
  const clientId = getGoogleClientId()
  if (!clientId) return

  await loadGoogleIdentityScript()

  window.google?.accounts.id.initialize({
    client_id: clientId,
    auto_select: true,
    cancel_on_tap_outside: true,
    callback: (response: GoogleCredentialResponse) => {
      if (!response.credential) {
        onError?.("Google did not return a credential")
        return
      }

      try {
        setGoogleCredential(response.credential)
      } catch (err) {
        onError?.(err instanceof Error ? err.message : "Google login failed")
      }
    },
  })

  window.google?.accounts.id.prompt()
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (configuration: GoogleIdConfiguration) => void
          renderButton: (
            container: HTMLElement,
            configuration: GoogleButtonConfiguration
          ) => void
          prompt: () => void
          disableAutoSelect: () => void
        }
      }
    }
  }
}
