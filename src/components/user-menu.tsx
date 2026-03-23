import { useMsal, useIsAuthenticated } from "@azure/msal-react"
import { LogIn, LogOut, User } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { loginRequest } from "@/lib/auth-config"

export function UserMenu() {
  const { instance, accounts } = useMsal()
  const isAuthenticated = useIsAuthenticated()

  if (!isAuthenticated) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => instance.loginPopup(loginRequest).catch(console.error)}
      >
        <LogIn className="h-4 w-4" />
        Sign in
      </Button>
    )
  }

  const account = accounts[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-primary text-primary-foreground">
          <User className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium">{account?.name ?? "User"}</p>
          <p className="text-xs text-muted-foreground">{account?.username}</p>
        </div>
        <DropdownMenuItem onClick={() => instance.logoutPopup().catch(console.error)}>
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
