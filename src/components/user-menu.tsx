import { useMsal, useIsAuthenticated } from "@azure/msal-react"
import { LogIn, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getPreferredAuthProvider, setPreferredAuthProvider } from "@/lib/auth-provider"
import { loginRequest } from "@/lib/auth-config"
import { clearGoogleCredential, useGoogleAuth } from "@/lib/google-auth"

export function UserMenu() {
  const { instance, accounts } = useMsal()
  const isMicrosoftAuthenticated = useIsAuthenticated()
  const googleAuth = useGoogleAuth()
  const preferredProvider = getPreferredAuthProvider()
  const isGoogleActive =
    googleAuth.isAuthenticated &&
    (preferredProvider === "google" || !isMicrosoftAuthenticated)
  const isMicrosoftActive = isMicrosoftAuthenticated && !isGoogleActive
  const isAuthenticated = isMicrosoftActive || isGoogleActive

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={async () => {
          clearGoogleCredential()
          const result = await instance.loginPopup(loginRequest)
          setPreferredAuthProvider("microsoft")
          instance.setActiveAccount(result.account)
        }}
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </Button>
    )
  }

  const account = accounts[0]
  const userName =
    isMicrosoftActive ? account?.name : googleAuth.user?.name
  const userEmail =
    isMicrosoftActive ? account?.username : googleAuth.user?.email

  async function handleLogout() {
    clearGoogleCredential()

    if (isMicrosoftActive) {
      await instance.logoutPopup().catch(console.error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{userName ?? "User"}</p>
          <p className="text-xs text-muted-foreground">{userEmail}</p>
        </div>
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
