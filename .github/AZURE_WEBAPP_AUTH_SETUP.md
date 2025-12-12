# Azure Web App Deployment - Authentication Setup Guide

This guide explains how to set up authentication for the GitHub Actions workflow that deploys to Azure Web App.

## 🔐 Authentication Mechanisms

### Overview

The workflow uses **two types of authentication**:

1. **Azure Container Registry (ACR) Authentication** - For pushing Docker images
2. **Azure Service Principal Authentication** - For deploying to Azure Web App

---

## 1️⃣ Azure Container Registry (ACR) Authentication

### Method: Username & Password (Admin Credentials)

**What it does:** Allows GitHub Actions to push Docker images to your ACR.

### Setup Steps:

#### Step 1: Enable Admin User on ACR

```bash
# Enable admin user
az acr update --name <your-acr-name> --admin-enabled true

# Get credentials
az acr credential show --name <your-acr-name>
```

#### Step 2: Add GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions → New repository secret

Add these secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `ACR_LOGIN_SERVER` | Your ACR login server | `azurecbepe.azurecr.io` |
| `ACR_USERNAME` | Admin username from Step 1 | `azurecbepe` |
| `ACR_PASSWORD` | Admin password from Step 1 | `<password-from-az-acr-credential>` |

### Alternative: Service Principal for ACR (More Secure)

```bash
# Create service principal with ACR push permissions
az ad sp create-for-rbac \
  --name "github-actions-acr-push" \
  --role "AcrPush" \
  --scopes /subscriptions/<subscription-id>/resourceGroups/<rg-name>/providers/Microsoft.ContainerRegistry/registries/<acr-name>
```

---

## 2️⃣ Azure Service Principal Authentication

### Method: Service Principal with JSON Credentials

**What it does:** Allows GitHub Actions to deploy to Azure Web App and manage Azure resources.

### Setup Steps:

#### Step 1: Create Service Principal

```bash
# Get your subscription ID
az account show --query id -o tsv

# Create service principal with Contributor role on the resource group
az ad sp create-for-rbac \
  --name "github-actions-webapp-deploy" \
  --role Contributor \
  --scopes /subscriptions/<subscription-id>/resourceGroups/Demo-web-app \
  --sdk-auth
```

**Output will look like:**
```json
{
  "clientId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "clientSecret": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "subscriptionId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "tenantId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "activeDirectoryEndpointUrl": "https://login.microsoftonline.com",
  "resourceManagerEndpointUrl": "https://management.azure.com/",
  "activeDirectoryGraphResourceId": "https://graph.windows.net/",
  "sqlManagementEndpointUrl": "https://management.core.windows.net:8443/",
  "galleryEndpointUrl": "https://gallery.azure.com/",
  "managementEndpointUrl": "https://management.core.windows.net/"
}
```

#### Step 2: Add GitHub Secret

Add this secret to your GitHub repository:

| Secret Name | Value |
|-------------|-------|
| `AZURE_CREDENTIALS` | **Entire JSON output** from Step 1 |

---

## 3️⃣ Configure Azure Web App to Pull from ACR

Your Azure Web App needs permission to pull images from ACR.

### Option A: Enable Managed Identity (Recommended)

```bash
# Enable system-assigned managed identity on Web App
az webapp identity assign \
  --name azure-demo-webapp \
  --resource-group Demo-web-app

# Get the principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name azure-demo-webapp \
  --resource-group Demo-web-app \
  --query principalId -o tsv)

# Grant AcrPull permission to the Web App's managed identity
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role AcrPull \
  --scope /subscriptions/<subscription-id>/resourceGroups/<acr-rg>/providers/Microsoft.ContainerRegistry/registries/<acr-name>

# Configure Web App to use managed identity for ACR
az webapp config set \
  --name azure-demo-webapp \
  --resource-group Demo-web-app \
  --generic-configurations '{"acrUseManagedIdentityCreds": true}'
```

### Option B: Use ACR Admin Credentials

```bash
# Configure Web App with ACR credentials
az webapp config container set \
  --name azure-demo-webapp \
  --resource-group Demo-web-app \
  --docker-custom-image-name <acr-name>.azurecr.io/sample-app:latest \
  --docker-registry-server-url https://<acr-name>.azurecr.io \
  --docker-registry-server-user <acr-username> \
  --docker-registry-server-password <acr-password>
```

---

## 📋 Complete GitHub Secrets Checklist

Make sure you have these secrets configured:

- [ ] `ACR_LOGIN_SERVER` - Your ACR server (e.g., `azurecbepe.azurecr.io`)
- [ ] `ACR_USERNAME` - ACR admin username
- [ ] `ACR_PASSWORD` - ACR admin password
- [ ] `AZURE_CREDENTIALS` - Service principal JSON (entire output)

---

## 🔒 Security Best Practices

### 1. **Use Managed Identity** (Most Secure)
- ✅ No credentials stored in GitHub
- ✅ Automatic credential rotation
- ✅ Azure-managed security

### 2. **Use Service Principal with Least Privilege**
- ✅ Scope to specific resource group
- ✅ Use specific roles (Contributor, not Owner)
- ✅ Rotate credentials regularly

### 3. **Disable ACR Admin User** (After setting up Managed Identity)
```bash
az acr update --name <acr-name> --admin-enabled false
```

### 4. **Use GitHub Environments**
- Set up approval gates for production deployments
- Restrict secrets to specific environments

---

## 🧪 Testing the Setup

### Test 1: Verify ACR Access

```bash
# Login to ACR using credentials
docker login <acr-name>.azurecr.io -u <username> -p <password>

# Should succeed
```

### Test 2: Verify Service Principal

```bash
# Login using service principal
az login --service-principal \
  -u <clientId> \
  -p <clientSecret> \
  --tenant <tenantId>

# List resources in the resource group
az resource list --resource-group Demo-web-app

# Should show the Web App
```

### Test 3: Verify Web App Can Pull from ACR

```bash
# Check Web App configuration
az webapp config show \
  --name azure-demo-webapp \
  --resource-group Demo-web-app \
  --query "{acrUseManagedIdentityCreds: acrUseManagedIdentityCreds}"

# Should return true if using managed identity
```

---

## 🚀 Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions Workflow                  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  1. Build Docker Image                │
        │     (from ./app directory)            │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  2. Login to ACR                      │
        │     (using ACR_USERNAME/PASSWORD)     │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  3. Push Image to ACR                 │
        │     Tags: latest, <git-sha>           │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  4. Login to Azure                    │
        │     (using AZURE_CREDENTIALS)         │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  5. Deploy to Web App                 │
        │     (azure/webapps-deploy@v2)         │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  6. Web App Pulls Image from ACR      │
        │     (using Managed Identity)          │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  7. Restart Web App                   │
        │     (ensures new image is loaded)     │
        └───────────────────────────────────────┘
```

---

## 🔧 Troubleshooting

### Issue: "unauthorized: authentication required"

**Cause:** ACR credentials are incorrect or expired.

**Solution:**
```bash
# Regenerate ACR credentials
az acr credential renew --name <acr-name> --password-name password

# Update GitHub secret ACR_PASSWORD
```

### Issue: "Web App deployment failed"

**Cause:** Service principal doesn't have permissions.

**Solution:**
```bash
# Grant Contributor role to service principal
az role assignment create \
  --assignee <service-principal-client-id> \
  --role Contributor \
  --scope /subscriptions/<subscription-id>/resourceGroups/Demo-web-app
```

### Issue: "Web App can't pull image from ACR"

**Cause:** Managed identity not configured or lacks permissions.

**Solution:**
```bash
# Re-run the managed identity setup from Section 3
```

---

## 📚 Additional Resources

- [Azure Container Registry Authentication](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [Azure Web Apps for Containers](https://docs.microsoft.com/en-us/azure/app-service/quickstart-custom-container)
- [GitHub Actions for Azure](https://github.com/Azure/actions)
- [Service Principal Best Practices](https://docs.microsoft.com/en-us/azure/active-directory/develop/howto-create-service-principal-portal)

---

## ✅ Quick Setup Script

Here's a complete script to set everything up:

```bash
#!/bin/bash

# Variables
SUBSCRIPTION_ID="<your-subscription-id>"
RESOURCE_GROUP="Demo-web-app"
WEBAPP_NAME="azure-demo-webapp"
ACR_NAME="<your-acr-name>"
ACR_RG="<acr-resource-group>"

# 1. Enable ACR admin user
echo "Enabling ACR admin user..."
az acr update --name $ACR_NAME --admin-enabled true

# 2. Get ACR credentials
echo "Getting ACR credentials..."
az acr credential show --name $ACR_NAME

# 3. Create service principal for GitHub Actions
echo "Creating service principal..."
az ad sp create-for-rbac \
  --name "github-actions-webapp-deploy" \
  --role Contributor \
  --scopes /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$RESOURCE_GROUP \
  --sdk-auth

# 4. Enable managed identity on Web App
echo "Enabling managed identity..."
az webapp identity assign \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP

# 5. Get principal ID
PRINCIPAL_ID=$(az webapp identity show \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --query principalId -o tsv)

# 6. Grant AcrPull permission
echo "Granting AcrPull permission..."
az role assignment create \
  --assignee $PRINCIPAL_ID \
  --role AcrPull \
  --scope /subscriptions/$SUBSCRIPTION_ID/resourceGroups/$ACR_RG/providers/Microsoft.ContainerRegistry/registries/$ACR_NAME

# 7. Configure Web App to use managed identity
echo "Configuring Web App..."
az webapp config set \
  --name $WEBAPP_NAME \
  --resource-group $RESOURCE_GROUP \
  --generic-configurations '{"acrUseManagedIdentityCreds": true}'

echo "Setup complete! Add the credentials to GitHub Secrets."
```

---

**Remember:** Keep your credentials secure and never commit them to your repository!
