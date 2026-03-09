# Example Terraform for Cloudflare Workers (provider v5)
# Prereq: Build output in dist/ or adjust content_file path
# Usage: export CLOUDFLARE_API_TOKEN=... && terraform init && terraform apply -var="account_id=YOUR_ID"
# See docs/guides/cloudflare-workers-mcp-cicd.md

terraform {
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5"
    }
  }
}

provider "cloudflare" {}

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
  modules = [{
    name         = "index.mjs"
    content_type = "application/javascript+module"
    content_file = "${path.module}/dist/index.mjs"
  }]
}

resource "cloudflare_workers_deployment" "mcp" {
  account_id  = var.account_id
  script_name = cloudflare_worker.mcp.name
  strategy    = "percentage"
  versions = [{
    percentage = 100
    version_id = cloudflare_worker_version.mcp.id
  }]
}
