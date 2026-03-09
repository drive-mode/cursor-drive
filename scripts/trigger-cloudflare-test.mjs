#!/usr/bin/env node
/**
 * Trigger Cloudflare Token Test workflow via GitHub API.
 * Loads GITHUB_PERSONAL_ACCESS_TOKEN from .env.
 *
 * Usage:
 *   npm run cloudflare:trigger
 *   node scripts/trigger-cloudflare-test.mjs
 *
 * Or with gh (after: gh auth login, or GH_TOKEN from .env):
 *   gh workflow run "Cloudflare Token Test" --repo drive-mode/cursor-drive
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function loadEnv() {
  const envPath = path.join(REPO_ROOT, ".env");
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
  }
  return env;
}

const env = loadEnv();
const token = env.GITHUB_PERSONAL_ACCESS_TOKEN || env.GPAT || process.env.GITHUB_PERSONAL_ACCESS_TOKEN || process.env.GPAT;

if (!token) {
  console.error("No token. Set GITHUB_PERSONAL_ACCESS_TOKEN or GPAT in .env");
  process.exit(1);
}

// Verify token and get user
const userRes = await fetch("https://api.github.com/user", {
  headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
});
if (!userRes.ok) {
  console.error("Token invalid:", userRes.status, await userRes.text());
  process.exit(1);
}
const { login } = await userRes.json();
console.log("Using token for:", login);

// GITHUB_REPO: owner/repo (drive-mode/cursor-drive for ai-secretagent token)
const repoSpec = env.GITHUB_REPO || process.env.GITHUB_REPO || "drive-mode/cursor-drive";
const [owner, repo] = repoSpec.split("/");
const workflowId = "cloudflare-token-test.yml";

// Verify repo access
const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  },
});
if (!repoRes.ok) {
  console.error(`Repo access failed: ${repoRes.status}. Check owner/repo and token (${owner}/${repo}).`);
  console.error(await repoRes.text());
  process.exit(1);
}

const listRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows`, {
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
  },
});
if (!listRes.ok) {
  console.error(`List workflows failed: ${listRes.status}`, await listRes.text());
  process.exit(1);
}
const { workflows } = await listRes.json();
if (!workflows?.length) {
  console.error("No workflows found. Is the repo correct?");
  process.exit(1);
}
const wf = workflows.find((w) => w.path?.includes("cloudflare-token-test"));
const id = wf?.id ?? workflowId;

const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/actions/workflows/${id}/dispatches`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ ref: "main" }),
});

if (!res.ok) {
  console.error(`Failed: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}

console.log(`Workflow triggered. Check https://github.com/${owner}/${repo}/actions`);
