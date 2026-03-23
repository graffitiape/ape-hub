import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { PublicClientApplication } from "@azure/msal-browser"
import { MsalProvider } from "@azure/msal-react"
import { msalConfig } from "@/lib/auth-config"
import { initApiClient } from "@/lib/api-client"
import App from "./App"
import "./index.css"

const msalInstance = new PublicClientApplication(msalConfig)

msalInstance.initialize().then(() => {
  initApiClient(msalInstance)
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>
  )
})
