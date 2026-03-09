# Cloudflare Workers MCP — Example Configs

Example files for deploying an MCP server to Cloudflare Workers. See the main guide: [cloudflare-workers-mcp-cicd.md](../cloudflare-workers-mcp-cicd.md).

| File | Purpose |
|------|---------|
| `deploy-worker.yml` | GitHub Actions workflow — copy to `.github/workflows/` |
| `wrangler.toml` | Wrangler config — copy to project root |
| `main.tf` | Terraform IaC — copy to `terraform/` or project root |
| `terraform.tfvars.example` | Example tfvars — copy to `terraform.tfvars` (gitignore) |
