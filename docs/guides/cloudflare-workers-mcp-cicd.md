# Cloudflare Workers MCP: CI/CD and IaC Setup

Guide for deploying an MCP server to Cloudflare Workers via CI/CD and Terraform. Use this when you want to host a remote MCP server (e.g. tldraw-style) that users can connect to with a URL—no local process required.

> **Deployment disclaimer:** Deploy at your own risk. Verify tokens, secrets, and account permissions before running in production. Never commit secrets to the repository.

---

## Overview

| Component | Purpose |
|-----------|---------|
| **API token** | Authenticates Wrangler/Terraform to Cloudflare (create once, store as secret) |
| **Account ID** | Identifies your Cloudflare account (find in dashboard) |
| **Wrangler** | Deploys Workers; used by GitHub Actions |
| **Terraform** | IaC for Workers + related resources (optional) |

**One-time manual steps:** Create Cloudflare account, create API token, add secrets to CI.

---

## 1. API Tokens

### Account vs user tokens

| Type | Use case |
|------|----------|
| **Account API token** | CI/CD, service principals; survives user departure. [Compatibility matrix](https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/#compatibility-matrix) |
| **User token** | Ad hoc scripting, personal use |

For CI/CD, use **Account API tokens**.

### Create token (manual, one-time)

1. Log into [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Go to **Manage Account** → **Account API Tokens** (or [direct link](https://dash.cloudflare.com/?to=/:account/api-tokens)).
3. **Create Token** → **Edit Cloudflare Workers** → **Use Template**.
4. Restrict to your account (and zones if needed).
5. **Continue to summary** → **Create Token**.
6. **Copy the secret** — it is shown only once.

**Required permissions (Edit Cloudflare Workers template):**

- Workers Scripts Write (Account)
- Workers Routes Write (Zone)
- Workers KV Storage Write (Account)
- Workers Tail Read (Account)
- Workers R2 Storage Write (Account)
- Account Settings Read (Account)
- User Details Read (User)
- User Memberships Read (User)

### Create token via API (API_FIXER bootstrap)

Use a **bootstrap token** (API_FIXER) with the [Create additional tokens](https://developers.cloudflare.com/fundamentals/api/reference/template/) template to create deploy tokens programmatically. This template grants **API Tokens Write** (User scope)—the only way to create tokens via API.

**Create API_FIXER (one-time, in dashboard):**

1. **Create Token** → **Create additional tokens** → **Use Template**.
2. Do not add other permissions. Copy the secret once—store as `API_FIXER` in `.env`.

**Create deploy token via script:**

```bash
npm run cloudflare:create-token
```

This uses `API_FIXER` to call `GET /user/tokens/permission_groups` (fetch IDs) and `POST /accounts/{account_id}/tokens` (create token). The new token is printed once—add it as `CLOUDFLARE_API_TOKEN` for CI or local use.

**Manual curl (reference):**

```bash
# 1. Fetch permission group IDs
curl "https://api.cloudflare.com/client/v4/user/tokens/permission_groups" \
  -H "Authorization: Bearer $API_FIXER"

# 2. Create token (use Workers Scripts Write id from step 1)
curl "https://api.cloudflare.com/client/v4/accounts/{account_id}/tokens" \
  -H "Authorization: Bearer $API_FIXER" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "ci-workers-deploy",
    "policies": [{
      "effect": "allow",
      "resources": { "com.cloudflare.api.account.<ACCOUNT_ID>": "*" },
      "permission_groups": [
        { "id": "<WORKERS_SCRIPTS_WRITE_ID>", "name": "Workers Scripts Write" }
      ]
    }]
  }'
```

See [Create tokens via API](https://developers.cloudflare.com/fundamentals/api/how-to/create-via-api/).

### Restrict token use (recommended)

- **TTL:** Set expiration (e.g. 90 days) and rotate.
- **IP filtering:** Restrict to GitHub Actions IP ranges if known.
- **Scope:** Limit to the single account you deploy to.

---

## 2. Account ID

1. [Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) → **Account details**.
2. Or **Account home** → account menu → **Copy account ID**.

---

## 2a. Local .env

Copy [.env.example](../../.env.example) to `.env` in the repo root (or use `%USERPROFILE%\.env\.env` per [mcp-user-setup](../reference/mcp-user-setup.md)). Set:

| Variable | Purpose |
|----------|---------|
| `CLOUDFLARE_API_TOKEN` | Deploy token for verify script and local wrangler |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID for create-token and verify |
| `API_FIXER` | Optional; bootstrap token for create-token script |

`.env` is in [.gitignore](../../.gitignore) — never commit it.

## 2b. GitHub Repository secrets (not Environment secrets)

Add secrets under **Settings → Secrets and variables → Actions → Repository secrets**. Do not use Environment secrets unless you have a specific reason (e.g. per-environment tokens).

| Secret | Value | Source |
|--------|-------|--------|
| `CLOUDFLARE_API_TOKEN` | Deploy token | Dashboard → Account API Tokens → Edit Cloudflare Workers, or `npm run cloudflare:create-token` |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID | Workers & Pages → Account details |

**GLOBAL_API_KEY and ORIGIN_CA_KEY:** Not needed for Workers deploy or the token test workflow. Add only if you use Terraform with legacy auth (`api_key` + `email`) or Origin CA certificate operations.

---

## 3. GitHub Actions CI/CD

### Secrets

Add as **Repository secrets** (Settings → Secrets and variables → Actions → Repository secrets):

| Secret | Value |
|--------|-------|
| `CLOUDFLARE_API_TOKEN` | Token from step 1 |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID from step 2 |

### Workflow

Create `.github/workflows/deploy-worker.yml`:

```yaml
name: Deploy Worker
on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - run: npm ci
      - run: npm run build  # if you have a build step

      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          # Optional:
          # wranglerVersion: "3.14.1"
          # workingDirectory: "packages/worker"
          # command: deploy --env production
```

### wrangler.toml

Minimal config in project root (or `workingDirectory`):

```toml
name = "my-mcp-server"
main = "src/index.js"
compatibility_date = "2025-03-04"
# account_id = ""  # Optional; can pass via action instead
```

**Docs:** [GitHub Actions for Workers](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/), [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/).

---

## 4. Terraform IaC

Use Terraform when you need to manage Workers plus DNS, KV, D1, or other resources in code.

### Provider setup

```hcl
terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
}

provider "cloudflare" {
  # Uses CLOUDFLARE_API_TOKEN from environment
}
```

### Auth

```bash
export CLOUDFLARE_API_TOKEN="your-token"
```

Never commit the token. Use env vars or a secret manager.

### Workers resources (provider v5)

Terraform v5 uses three resources for Workers:

```hcl
variable "account_id" {
  type      = string
  sensitive = true
}

resource "cloudflare_worker" "mcp" {
  account_id   = var.account_id
  name         = "my-mcp-server"
  observability = { enabled = true }
}

resource "cloudflare_worker_version" "mcp" {
  account_id         = var.account_id
  worker_id          = cloudflare_worker.mcp.id
  compatibility_date = "2025-03-04"
  main_module        = "index.mjs"
  modules {
    name         = "index.mjs"
    content_type = "application/javascript+module"
    content_file = "${path.module}/dist/index.mjs"
  }
}

resource "cloudflare_workers_deployment" "mcp" {
  account_id  = var.account_id
  script_name = cloudflare_worker.mcp.name
  strategy    = "percentage"
  versions {
    percentage = 100
    version_id = cloudflare_worker_version.mcp.id
  }
}
```

### Bundling

Terraform does not bundle. Build first:

```bash
npm run build   # or wrangler deploy --dry-run --outdir dist
```

Use `content_file` to point at the built output. Avoid `content_base64` for large scripts (bloats state).

### Apply

```bash
terraform init
terraform plan -var="account_id=YOUR_ACCOUNT_ID"
terraform apply -var="account_id=YOUR_ACCOUNT_ID"
```

Use `terraform.tfvars` (gitignored) or CI secrets for `account_id`.

### Terraform vs Wrangler

| Use case | Tool |
|----------|------|
| Single Worker, fast dev | Wrangler |
| Local dev (`wrangler dev`) | Wrangler |
| CI/CD deploy | Wrangler + GitHub Actions |
| Multi-resource infra (Workers + DNS + KV) | Terraform |
| GitOps, versioned infra | Terraform |

**Hybrid:** Build with Wrangler, deploy with Terraform if you need infra-as-code.

---

## 5. MCP project scaffold (Cloudflare template)

Quick start for an authless MCP Worker:

```bash
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp-authless
cd my-mcp-server
```

Add your tools in `src/index.ts`, then:

```bash
npm run deploy
```

URL: `https://my-mcp-server.<subdomain>.workers.dev/mcp`

---

## 6. User setup (Cursor)

Users add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "my-server": {
      "url": "https://my-mcp-server.<subdomain>.workers.dev/mcp"
    }
  }
}
```

No Cloudflare account required for users.

---

## References

| Topic | URL |
|-------|-----|
| Account API tokens | https://developers.cloudflare.com/fundamentals/api/get-started/account-owned-tokens/ |
| Create token | https://developers.cloudflare.com/fundamentals/api/get-started/create-token/ |
| Create via API | https://developers.cloudflare.com/fundamentals/api/how-to/create-via-api/ |
| GitHub Actions | https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/ |
| Find account/zone IDs | https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/ |
| Terraform provider | https://developers.cloudflare.com/terraform |
| Wrangler config | https://developers.cloudflare.com/workers/wrangler/configuration/ |
