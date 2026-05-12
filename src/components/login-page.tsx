import { useState } from "react"
import { InteractionStatus } from "@azure/msal-browser"
import { useMsal } from "@azure/msal-react"
import { FolderKanban, LogIn, ShieldCheck } from "lucide-react"
import heroImage from "@/assets/hero.png"
import { Button } from "@/components/ui/button"
import { loginRequest } from "@/lib/auth-config"

export function LoginPage() {
  const { instance, inProgress } = useMsal()
  const [error, setError] = useState<string | null>(null)

  const isBusy = inProgress !== InteractionStatus.None

  async function handleLogin() {
    setError(null)

    try {
      const result = await instance.loginPopup(loginRequest)
      instance.setActiveAccount(result.account)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    }
  }

  return (
    <div className="grid min-h-screen bg-background text-foreground lg:grid-cols-[minmax(0,1fr)_440px]">
      <section className="relative hidden overflow-hidden border-r bg-sidebar px-10 py-8 text-sidebar-foreground lg:flex lg:flex-col">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <FolderKanban className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Ape Hub</h1>
            <p className="text-sm text-muted-foreground">Project boards</p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <img
            src={heroImage}
            alt=""
            className="h-auto w-full max-w-[320px] object-contain drop-shadow-2xl"
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          {["Projects", "Columns", "Tasks"].map((label) => (
            <div key={label} className="rounded-lg border bg-background/60 p-3">
              <p className="text-sm font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-5">
            <div className="flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <FolderKanban className="h-5 w-5" />
              </div>
              <h1 className="text-xl font-semibold">Ape Hub</h1>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span>Private workspace</span>
              </div>
              <h2 className="text-3xl font-semibold">Login to Ape Hub</h2>
              <p className="text-sm text-muted-foreground">
                Use your Microsoft account to continue.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              className="h-11 w-full"
              disabled={isBusy}
              onClick={handleLogin}
            >
              <LogIn className="h-4 w-4" />
              {isBusy ? "Opening login..." : "Login with Microsoft"}
            </Button>

            {error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  )
}
