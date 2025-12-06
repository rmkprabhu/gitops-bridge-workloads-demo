# sample-app

Minimal Node.js application used to demonstrate building and pushing to Azure Container Registry (ACR) via GitHub Actions.

Access: `GET /` returns a small HTML message.

Build/push: The repository contains a GitHub Actions workflow that builds `app/` and pushes to your ACR.

Required repo secrets:
- `AZURE_CREDENTIALS` — JSON credentials for `azure/login` (service principal).
- `ACR_LOGIN_SERVER` — e.g. `myregistry.azurecr.io`.

