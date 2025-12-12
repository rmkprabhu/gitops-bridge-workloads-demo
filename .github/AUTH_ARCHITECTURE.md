# Authentication Architecture

## 🔐 Complete Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    GitHub Secrets                            │  │
│  │                                                              │  │
│  │  • ACR_LOGIN_SERVER    (azurecbepe.azurecr.io)             │  │
│  │  • ACR_USERNAME        (ACR admin username)                 │  │
│  │  • ACR_PASSWORD        (ACR admin password)                 │  │
│  │  • AZURE_CREDENTIALS   (Service Principal JSON)             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              │                                      │
│                              ▼                                      │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              GitHub Actions Workflow                         │  │
│  │         (build-push-deploy-webapp.yml)                       │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                               │
                               │
        ┌──────────────────────┴──────────────────────┐
        │                                             │
        ▼                                             ▼
┌───────────────────┐                    ┌────────────────────────┐
│   ACR Login       │                    │   Azure Login          │
│   (Step 1)        │                    │   (Step 2)             │
│                   │                    │                        │
│   Uses:           │                    │   Uses:                │
│   • ACR_USERNAME  │                    │   • AZURE_CREDENTIALS  │
│   • ACR_PASSWORD  │                    │     (Service Principal)│
└─────────┬─────────┘                    └────────────┬───────────┘
          │                                           │
          ▼                                           │
┌─────────────────────────────────────────┐          │
│  Azure Container Registry (ACR)         │          │
│                                         │          │
│  ┌───────────────────────────────────┐ │          │
│  │  Docker Image Repository          │ │          │
│  │                                   │ │          │
│  │  sample-app:latest                │ │          │
│  │  sample-app:<git-sha>             │ │          │
│  └───────────────────────────────────┘ │          │
│                                         │          │
│  Authentication: Admin Credentials      │          │
└─────────────────┬───────────────────────┘          │
                  │                                  │
                  │                                  │
                  │         ┌────────────────────────┘
                  │         │
                  │         ▼
                  │  ┌──────────────────────────────────────┐
                  │  │   Azure Resource Manager             │
                  │  │                                      │
                  │  │   Deploys to:                        │
                  │  │   • Resource Group: Demo-web-app     │
                  │  │   • Web App: azure-demo-webapp       │
                  │  │                                      │
                  │  │   Authentication: Service Principal  │
                  │  └──────────────┬───────────────────────┘
                  │                 │
                  │                 ▼
                  │  ┌──────────────────────────────────────┐
                  │  │      Azure Web App                   │
                  │  │   (azure-demo-webapp)                │
                  │  │                                      │
                  │  │   ┌──────────────────────────────┐  │
                  │  │   │  Managed Identity            │  │
                  │  │   │  (System-Assigned)           │  │
                  │  │   │                              │  │
                  │  │   │  Role: AcrPull               │  │
                  │  │   └──────────────────────────────┘  │
                  │  │                │                     │
                  │  └────────────────┼─────────────────────┘
                  │                   │
                  └───────────────────┘
                          │
                          ▼
                    ┌─────────────┐
                    │  Image Pull │
                    │  from ACR   │
                    └─────────────┘
```

## 🔑 Authentication Methods Explained

### 1. **GitHub → ACR** (Push Images)

**Method:** Username/Password (Admin Credentials)

```yaml
- name: Login to ACR
  uses: azure/docker-login@v1
  with:
    login-server: ${{ secrets.ACR_LOGIN_SERVER }}
    username: ${{ secrets.ACR_USERNAME }}
    password: ${{ secrets.ACR_PASSWORD }}
```

**Why:** Simple, straightforward authentication for CI/CD pipelines.

**Security Note:** Admin credentials should be rotated regularly.

---

### 2. **GitHub → Azure** (Deploy Resources)

**Method:** Service Principal with JSON Credentials

```yaml
- name: Login to Azure
  uses: azure/login@v1
  with:
    creds: ${{ secrets.AZURE_CREDENTIALS }}
```

**AZURE_CREDENTIALS Format:**
```json
{
  "clientId": "<service-principal-app-id>",
  "clientSecret": "<service-principal-password>",
  "subscriptionId": "<azure-subscription-id>",
  "tenantId": "<azure-tenant-id>"
}
```

**Why:** Service Principal provides scoped access to Azure resources.

**Permissions:** Contributor role on `Demo-web-app` resource group.

---

### 3. **Web App → ACR** (Pull Images)

**Method:** Managed Identity (System-Assigned)

```bash
# Web App uses its managed identity to authenticate to ACR
# No credentials needed in code or configuration
```

**Why:** 
- ✅ No credentials to manage
- ✅ Automatic credential rotation
- ✅ Azure-managed security
- ✅ Follows principle of least privilege

**Permissions:** AcrPull role on the ACR.

---

## 🔒 Security Comparison

| Method | Security Level | Credential Management | Rotation |
|--------|---------------|----------------------|----------|
| **ACR Admin** | ⚠️ Medium | Manual | Manual |
| **Service Principal** | ✅ High | Manual | Manual |
| **Managed Identity** | ✅✅ Highest | Automatic | Automatic |

---

## 🎯 Recommended Setup

### For Production:

1. **GitHub → ACR:** Use Service Principal (not admin credentials)
2. **GitHub → Azure:** Use Federated Identity (OpenID Connect)
3. **Web App → ACR:** Use Managed Identity ✅

### For Development/Testing:

1. **GitHub → ACR:** Admin credentials (easier setup)
2. **GitHub → Azure:** Service Principal with JSON
3. **Web App → ACR:** Managed Identity ✅

---

## 🔄 Authentication Flow Step-by-Step

### Build & Push Phase

```
1. GitHub Actions starts
   ↓
2. Reads ACR_USERNAME and ACR_PASSWORD from secrets
   ↓
3. Authenticates to ACR using docker login
   ↓
4. Builds Docker image
   ↓
5. Pushes image to ACR
   ✅ Image stored in ACR
```

### Deploy Phase

```
1. Reads AZURE_CREDENTIALS from secrets
   ↓
2. Authenticates to Azure using Service Principal
   ↓
3. Calls Azure Web App Deploy API
   ↓
4. Azure updates Web App configuration
   ↓
5. Web App uses Managed Identity to pull image from ACR
   ↓
6. ACR validates Managed Identity has AcrPull role
   ↓
7. Image pulled and deployed
   ✅ App running
```

---

## 🛡️ Security Best Practices

### ✅ DO:

- Use Managed Identity for Web App → ACR
- Scope Service Principal to specific resource group
- Rotate credentials regularly
- Use GitHub Environments for production deployments
- Enable Azure AD authentication where possible
- Monitor access logs

### ❌ DON'T:

- Commit credentials to repository
- Use Owner role for Service Principal
- Share credentials across environments
- Use admin credentials in production
- Disable audit logging

---

## 📊 Credential Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│                   Initial Setup                         │
│                                                         │
│  1. Create Service Principal                           │
│  2. Enable ACR Admin User                              │
│  3. Enable Web App Managed Identity                    │
│  4. Grant Permissions                                  │
│  5. Add Secrets to GitHub                              │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│                 Regular Operations                      │
│                                                         │
│  • GitHub Actions uses credentials automatically       │
│  • Managed Identity auto-renews                        │
│  • No manual intervention needed                       │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Credential Rotation (Every 90 days)        │
│                                                         │
│  1. Regenerate ACR admin password                      │
│  2. Create new Service Principal secret                │
│  3. Update GitHub Secrets                              │
│  4. Managed Identity: No action needed ✅              │
└─────────────────────────────────────────────────────────┘
```

---

## 🔍 Troubleshooting Authentication Issues

### Issue: "unauthorized: authentication required"

**Location:** GitHub Actions → ACR

**Cause:** Invalid ACR credentials

**Fix:**
```bash
az acr credential show --name <acr-name>
# Update ACR_USERNAME and ACR_PASSWORD in GitHub Secrets
```

---

### Issue: "AADSTS7000215: Invalid client secret"

**Location:** GitHub Actions → Azure

**Cause:** Service Principal secret expired or invalid

**Fix:**
```bash
# Create new secret
az ad sp credential reset --id <client-id>
# Update AZURE_CREDENTIALS in GitHub Secrets
```

---

### Issue: "Failed to pull image from ACR"

**Location:** Web App → ACR

**Cause:** Managed Identity not configured or lacks permissions

**Fix:**
```bash
# Verify managed identity is enabled
az webapp identity show --name azure-demo-webapp --resource-group Demo-web-app

# Grant AcrPull permission
az role assignment create \
  --assignee <principal-id> \
  --role AcrPull \
  --scope <acr-resource-id>
```

---

## 📚 Further Reading

- [Azure Managed Identities](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/)
- [Service Principal Authentication](https://docs.microsoft.com/en-us/azure/active-directory/develop/app-objects-and-service-principals)
- [ACR Authentication Methods](https://docs.microsoft.com/en-us/azure/container-registry/container-registry-authentication)
- [GitHub Actions Security](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
