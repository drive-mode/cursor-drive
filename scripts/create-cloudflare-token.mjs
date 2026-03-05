#!/usr/bin/env node
/**
 * Create a Cloudflare API token with Workers deploy permissions using API_FIXER.
 *
 * API_FIXER must be a bootstrap token created with "Create additional tokens" template
 * (API Tokens Write). See docs/guides/cloudflare-workers-mcp-cicd.md.
 *
 * Env: API_FIXER, CLOUDFLARE_ACCOUNT_ID (from .env)
 *
 * Usage: node scripts/create-cloudflare-token.mjs
 *        npm run cloudflare:create-token
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
const apiFixer = process.env.API_FIXER || env.API_FIXER;
const accountId = (env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();

if (!apiFixer) {
  console.error("Set API_FIXER in .env (bootstrap token, Create additional tokens template)");
  process.exit(1);
}
if (!accountId) {
  console.error("Set CLOUDFLARE_ACCOUNT_ID in .env");
  process.exit(1);
}

const headers = { Authorization: `Bearer ${apiFixer}` };

async function main() {
  // 1. Fetch permission groups
  const pgRes = await fetch("https://api.cloudflare.com/client/v4/user/tokens/permission_groups", {
    headers,
  });
  if (pgRes.status !== 200) {
    const body = await pgRes.json();
    console.error("Permission groups failed:", pgRes.status, body.errors?.[0]?.message || body);
    console.error("Ensure API_FIXER uses 'Create additional tokens' template.");
    process.exit(1);
  }
  const groups = (await pgRes.json()).result || [];
  const workersScriptsWrite = groups.find(
    (g) => g.name === "Workers Scripts Write" && g.scopes?.includes("com.cloudflare.api.account")
  );
  const workersRoutesWrite = groups.find(
    (g) => g.name === "Workers Routes Write" && g.scopes?.includes("com.cloudflare.api.account.zone")
  );
  const accountSettingsRead = groups.find(
    (g) => g.name === "Account Settings Read" && g.scopes?.includes("com.cloudflare.api.account")
  );
  const userDetailsRead = groups.find(
    (g) => g.name === "User Details Read" && g.scopes?.includes("com.cloudflare.api.user")
  );
  const userMembershipsRead = groups.find(
    (g) => g.name === "User Memberships Read" && g.scopes?.includes("com.cloudflare.api.user")
  );

  const accountResource = `com.cloudflare.api.account.${accountId}`;
  const zoneResource = `com.cloudflare.api.account.${accountId}.zone.*`;

  const policies = [];
  if (workersScriptsWrite) {
    policies.push({
      effect: "allow",
      resources: { [accountResource]: "*" },
      permission_groups: [{ id: workersScriptsWrite.id, name: workersScriptsWrite.name }],
    });
  }
  if (workersRoutesWrite) {
    policies.push({
      effect: "allow",
      resources: { [zoneResource]: "*" },
      permission_groups: [{ id: workersRoutesWrite.id, name: workersRoutesWrite.name }],
    });
  }
  if (accountSettingsRead) {
    policies.push({
      effect: "allow",
      resources: { [accountResource]: "*" },
      permission_groups: [{ id: accountSettingsRead.id, name: accountSettingsRead.name }],
    });
  }
  if (userDetailsRead) {
    policies.push({
      effect: "allow",
      resources: { "com.cloudflare.api.user.*": "*" },
      permission_groups: [{ id: userDetailsRead.id, name: userDetailsRead.name }],
    });
  }
  if (userMembershipsRead) {
    policies.push({
      effect: "allow",
      resources: { "com.cloudflare.api.user.*": "*" },
      permission_groups: [{ id: userMembershipsRead.id, name: userMembershipsRead.name }],
    });
  }

  if (policies.length === 0) {
    console.error("Could not find required permission groups. API may have changed.");
    process.exit(1);
  }

  // 2. Create token
  const createRes = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/tokens`,
    {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "ci-workers-deploy",
        policies,
      }),
    }
  );
  const createBody = await createRes.json();
  if (createRes.status !== 200) {
    console.error("Create token failed:", createRes.status, createBody.errors?.[0]?.message || createBody);
    process.exit(1);
  }

  const secret = createBody.result?.value;
  if (!secret) {
    console.error("No token secret in response");
    process.exit(1);
  }
  console.log("Created token. Add to CLOUDFLARE_API_TOKEN (shown once):");
  console.log(secret);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
