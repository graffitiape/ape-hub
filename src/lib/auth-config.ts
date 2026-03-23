import type { Configuration, PopupRequest } from "@azure/msal-browser"

export const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || "YOUR_CLIENT_ID",
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || "common"}`,
    redirectUri: import.meta.env.VITE_REDIRECT_URI || window.location.origin,
  },
  cache: {
    cacheLocation: "localStorage",
    storeAuthStateInCookie: false,
  },
}

export const loginRequest: PopupRequest = {
  scopes: [
    "User.Read",
    `api://${import.meta.env.VITE_AZURE_CLIENT_ID}/access_as_user`,
  ],
}
