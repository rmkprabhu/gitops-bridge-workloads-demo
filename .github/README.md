# Azure Web App Deployment with GitHub Actions

This directory contains GitHub Actions workflows and documentation for deploying containerized applications to Azure Web App.

## 📁 Files Overview

| File | Purpose |
|------|---------|
| `workflows/build-and-push-acr.yml` | Original workflow - builds and pushes to ACR only |
| `workflows/build-push-deploy-webapp.yml` | **New** - builds, pushes to ACR, and deploys to Azure Web App |
| `QUICK_SETUP.md` | ⚡ 5-minute setup guide |
| `AZURE_WEBAPP_AUTH_SETUP.md` | 📖 Comprehensive authentication setup guide |
| `AUTH_ARCHITECTURE.md` | 🏗️ Detailed architecture and security documentation |

## 🚀 Quick Start

### Prerequisites

- Azure subscription
- Azure Container Registry (ACR)
- Azure Web App for Containers
- GitHub repository

### Setup (5 minutes)

1. **Get ACR credentials:**
   ```bash
   az acr credential show --name <your-acr-name>
   ```

2. **Create Service Principal:**
   ```bash
   az ad sp create-for-rbac \
     --name "github-actions-webapp" \
     --role Contributor \
     --scopes /subscriptions/<sub-id>/resourceGroups/Demo-web-app \
     --sdk-auth
   ```

3. **Configure Managed Identity:**
   ```bash
   az webapp identity assign --name azure-demo-webapp --resource-group Demo-web-app
   # Then grant AcrPull role (see QUICK_SETUP.md)
   ```

4. **Add GitHub Secrets:**
   - `ACR_LOGIN_SERVER`
   - `ACR_USERNAME`
   - `ACR_PASSWORD`
   - `AZURE_CREDENTIALS`

5. **Push code and watch it deploy!**

For detailed steps, see [QUICK_SETUP.md](./QUICK_SETUP.md)

## 🔐 Authentication Overview

The deployment uses **three authentication mechanisms**:

### 1. GitHub → ACR (Push Images)
- **Method:** Admin credentials (username/password)
- **Secrets:** `ACR_USERNAME`, `ACR_PASSWORD`

### 2. GitHub → Azure (Deploy App)
- **Method:** Service Principal with JSON credentials
- **Secret:** `AZURE_CREDENTIALS`

### 3. Web App → ACR (Pull Images)
- **Method:** Managed Identity (system-assigned)
- **Setup:** One-time Azure CLI configuration
- **Benefits:** No credentials, automatic rotation, highest security

For detailed information, see [AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md)

## 📊 Deployment Flow

```
Code Push → GitHub Actions → Build Image → Push to ACR → Deploy to Web App → Web App Pulls Image → App Running
```

## 🎯 Web App Details

- **Name:** `azure-demo-webapp`
- **Resource Group:** `Demo-web-app`
- **URL:** https://azure-demo-webapp-abekhkd7gah9ccbt.canadacentral-01.azurewebsites.net
- **Image:** Pulled from ACR with Managed Identity

## 🔧 Workflows Comparison

### Original Workflow (`build-and-push-acr.yml`)

```yaml
Trigger: Push to app/** or workflow file
Steps:
  1. Checkout code
  2. Login to ACR
  3. Build and push image
Result: Image in ACR
```

### New Workflow (`build-push-deploy-webapp.yml`)

```yaml
Trigger: Push to app/** or workflow file (main branch)
Steps:
  1. Checkout code
  2. Setup Docker Buildx
  3. Login to ACR
  4. Build and push image (with caching)
  5. Login to Azure
  6. Deploy to Web App
  7. Restart Web App
  8. Report status
Result: Image in ACR + Deployed to Web App
```

**Key Improvements:**
- ✅ Automated deployment to Web App
- ✅ Docker layer caching for faster builds
- ✅ Git SHA tagging for version tracking
- ✅ Automatic Web App restart
- ✅ Deployment status reporting

## 🛡️ Security Best Practices

### ✅ Implemented

- Managed Identity for Web App → ACR (no credentials)
- Service Principal scoped to resource group only
- Secrets stored in GitHub (not in code)
- Docker layer caching for efficiency

### 🔄 Recommended

- Rotate ACR admin credentials every 90 days
- Rotate Service Principal secrets every 90 days
- Use GitHub Environments for production
- Enable Azure AD authentication
- Monitor deployment logs

## 📝 Required GitHub Secrets

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `ACR_LOGIN_SERVER` | ACR URL | `azurecbepe.azurecr.io` |
| `ACR_USERNAME` | ACR admin username | `az acr credential show` |
| `ACR_PASSWORD` | ACR admin password | `az acr credential show` |
| `AZURE_CREDENTIALS` | Service Principal JSON | `az ad sp create-for-rbac --sdk-auth` |

## 🧪 Testing

### Test the Workflow

```bash
# Make a change to the app
echo "// test" >> app/index.js

# Commit and push
git add .
git commit -m "test: trigger deployment"
git push origin main
```

### Verify Deployment

```bash
# Check Web App logs
az webapp log tail --name azure-demo-webapp --resource-group Demo-web-app

# Check Web App status
az webapp show --name azure-demo-webapp --resource-group Demo-web-app --query state

# Test the endpoint
curl https://azure-demo-webapp-abekhkd7gah9ccbt.canadacentral-01.azurewebsites.net
```

## 🆘 Troubleshooting

### Workflow Fails at "Login to ACR"
→ Check `ACR_USERNAME` and `ACR_PASSWORD` secrets

### Workflow Fails at "Login to Azure"
→ Verify `AZURE_CREDENTIALS` is valid JSON with all required fields

### Deployment Succeeds but App Doesn't Update
→ Check managed identity is configured and has AcrPull permission

### Web App Shows "Application Error"
→ Check container logs: `az webapp log tail --name azure-demo-webapp --resource-group Demo-web-app`

For detailed troubleshooting, see [AZURE_WEBAPP_AUTH_SETUP.md](./AZURE_WEBAPP_AUTH_SETUP.md#-troubleshooting)

## 📚 Documentation Index

1. **[QUICK_SETUP.md](./QUICK_SETUP.md)** - Start here! 5-minute setup guide
2. **[AZURE_WEBAPP_AUTH_SETUP.md](./AZURE_WEBAPP_AUTH_SETUP.md)** - Comprehensive authentication guide
3. **[AUTH_ARCHITECTURE.md](./AUTH_ARCHITECTURE.md)** - Architecture and security deep dive

## 🔄 Workflow Triggers

### Automatic Deployment

The workflow automatically runs when:
- Code is pushed to `app/**` directory
- Workflow file is modified
- Push is to `main` branch

### Manual Deployment

You can also trigger manually:
1. Go to GitHub Actions tab
2. Select "Build, Push to ACR, and Deploy to Azure Web App"
3. Click "Run workflow"

## 📈 Monitoring

### GitHub Actions

- View workflow runs: Repository → Actions tab
- Check logs for each step
- Monitor deployment duration

### Azure Portal

- Web App metrics and logs
- Container insights
- Application Insights (if configured)

### Azure CLI

```bash
# Stream logs
az webapp log tail --name azure-demo-webapp --resource-group Demo-web-app

# Get deployment history
az webapp deployment list --name azure-demo-webapp --resource-group Demo-web-app

# Check app settings
az webapp config show --name azure-demo-webapp --resource-group Demo-web-app
```

## 🎓 Learning Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Azure Container Registry](https://docs.microsoft.com/en-us/azure/container-registry/)
- [Azure Web Apps for Containers](https://docs.microsoft.com/en-us/azure/app-service/quickstart-custom-container)
- [Azure Managed Identities](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/)

## 💡 Tips

- Use `latest` tag for development, Git SHA for production
- Enable continuous deployment for faster iterations
- Monitor ACR storage usage
- Set up alerts for failed deployments
- Use staging slots for zero-downtime deployments

---

**Need help?** Check the documentation files or open an issue!
