# Quick Setup - Azure Web App Deployment

## 🚀 5-Minute Setup

### Step 1: Get ACR Credentials

```bash
az acr credential show --name <your-acr-name>
```

Copy the **username** and **password**.

### Step 2: Create Service Principal

```bash
az ad sp create-for-rbac \
  --name "github-actions-webapp" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/Demo-web-app \
  --sdk-auth
```

Copy the **entire JSON output**.

### Step 3: Setup Managed Identity

```bash
# Enable managed identity
az webapp identity assign \
  --name azure-demo-webapp \
  --resource-group Demo-web-app

# Get principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name azure-demo-webapp \
  --resource-group Demo-web-app \
  --query principalId -o tsv)

# Grant ACR access
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role AcrPull \
  --scope /subscriptions/<sub-id>/resourceGroups/<acr-rg>/providers/Microsoft.ContainerRegistry/registries/<acr-name>

# Enable managed identity for ACR
az webapp config set \
  --name azure-demo-webapp \
  --resource-group Demo-web-app \
  --generic-configurations '{"acrUseManagedIdentityCreds": true}'
```

### Step 4: Add GitHub Secrets

Go to: **GitHub Repo → Settings → Secrets and variables → Actions**

Add these 4 secrets:

| Secret Name | Value Source |
|-------------|--------------|
| `ACR_LOGIN_SERVER` | Your ACR URL (e.g., `azurecbepe.azurecr.io`) |
| `ACR_USERNAME` | From Step 1 |
| `ACR_PASSWORD` | From Step 1 |
| `AZURE_CREDENTIALS` | Entire JSON from Step 2 |

### Step 5: Test the Workflow

```bash
# Make a change to app/index.js
echo "// test change" >> app/index.js

# Commit and push
git add .
git commit -m "test: trigger deployment"
git push
```

Watch the workflow run in GitHub Actions!

---

## 🔍 Verify Setup

```bash
# Check Web App can access ACR
az webapp config show \
  --name azure-demo-webapp \
  --resource-group Demo-web-app \
  --query "acrUseManagedIdentityCreds"

# Should return: true
```

---

## 📱 Access Your App

After deployment completes:

**URL:** https://azure-demo-webapp-abekhkd7gah9ccbt.canadacentral-01.azurewebsites.net

---

## 🆘 Quick Troubleshooting

**Workflow fails at "Login to ACR"?**
→ Check `ACR_USERNAME` and `ACR_PASSWORD` secrets

**Workflow fails at "Login to Azure"?**
→ Check `AZURE_CREDENTIALS` secret (must be valid JSON)

**Deployment succeeds but app doesn't update?**
→ Check managed identity is configured (Step 3)

**Web App shows "Application Error"?**
→ Check logs: `az webapp log tail --name azure-demo-webapp --resource-group Demo-web-app`

---

## 📋 Required GitHub Secrets Summary

```
ACR_LOGIN_SERVER=azurecbepe.azurecr.io
ACR_USERNAME=<from-acr-credentials>
ACR_PASSWORD=<from-acr-credentials>
AZURE_CREDENTIALS={"clientId":"...","clientSecret":"...","subscriptionId":"...","tenantId":"..."}
```

---

## 🎯 What the Workflow Does

1. ✅ Builds Docker image from `./app`
2. ✅ Pushes to ACR with tags: `latest` and `<git-sha>`
3. ✅ Deploys to Azure Web App
4. ✅ Restarts Web App to load new image
5. ✅ Reports deployment status

---

For detailed information, see: [AZURE_WEBAPP_AUTH_SETUP.md](./AZURE_WEBAPP_AUTH_SETUP.md)
