#!/usr/bin/env node
/**
 * Verify Cloudflare API token locally (no curl; works on Windows PowerShell).
 * Uses Node fetch instead of curl to avoid PowerShell's curl alias issues.
 *
 * Token source (first wins):
 *   API_FIXER           - bootstrap token (Create additional tokens). Verified via
 *                         GET /user/tokens/permission_groups (requires API Tokens Write).
 *                         Use to create worker-deploy tokens via create-cloudflare-token.mjs.
 *   CLOUDFLARE_API_TOKEN - deploy token (Edit Cloudflare Workers). Verified via
 *                         GET /user/tokens/verify.
 *   CLOUDFLARE_ACCOUNT_ID - .env (for account check)
 *
 * Usage:
 *   node scripts/verify-cloudflare-token.mjs
 *   API_FIXER=your_bootstrap_token node scripts/verify-cloudflare-token.mjs
 *   npm run cloudflare:verify
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
const deployToken =
  env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN;
const token = apiFixer || deployToken;
const globalKey = env.GLOBAL_API_KEY || process.env.GLOBAL_API_KEY;
const accountEmail = env.CLOUDFLARE_ACCOUNT_EMAIL || process.env.CLOUDFLARE_ACCOUNT_EMAIL;
const accountId = (env.CLOUDFLARE_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();

const useLegacyAuth = !token && globalKey && accountEmail && accountId;
const hasLegacyAuth = globalKey && accountEmail && accountId;

if (!token && !useLegacyAuth) {
  const hasPartialLegacy = globalKey && accountId;
  const msg =
    hasPartialLegacy
      ? "Add CLOUDFLARE_ACCOUNT_EMAIL to .env for legacy auth (you have GLOBAL_API_KEY + CLOUDFLARE_ACCOUNT_ID)."
      : "No token. Set one of:\n" +
      "  - API_FIXER (bootstrap token, Create additional tokens)\n" +
      "  - CLOUDFLARE_API_TOKEN (deploy token, Edit Cloudflare Workers)\n" +
      "  - GLOBAL_API_KEY + CLOUDFLARE_ACCOUNT_EMAIL + CLOUDFLARE_ACCOUNT_ID (legacy auth)";
  console.error(msg);
  process.exit(1);
}

async function main() {
  let baseHeaders;
  if (useLegacyAuth) {
    baseHeaders = { "X-Auth-Email": accountEmail, "X-Auth-Key": globalKey };
    console.log("Using legacy auth (X-Auth-Email + X-Auth-Key)");
  } else {
    const bearer = { Authorization: `Bearer ${token}` };

    // API_FIXER = bootstrap token (Create additional tokens). Verify via permission_groups
    // (requires API Tokens Write). /user/tokens/verify may not work for bootstrap tokens.
    if (apiFixer) {
      const pgRes = await fetch("https://api.cloudflare.com/client/v4/user/tokens/permission_groups", {
        headers: bearer,
      });
      const pgBody = await pgRes.json();
      if (pgRes.status === 200) {
        baseHeaders = bearer;
        const count = (pgBody.result || []).length;
        console.log("API_FIXER (bootstrap) OK — can create tokens. Permission groups:", count);
      } else if (hasLegacyAuth) {
        console.log("API_FIXER failed (" + pgRes.status + "); falling back to legacy auth");
        baseHeaders = { "X-Auth-Email": accountEmail, "X-Auth-Key": globalKey };
      } else {
        console.error("API_FIXER failed. Ensure it uses 'Create additional tokens' template.");
        process.exit(1);
      }
    } else {
      // Deploy token: verify via /user/tokens/verify
      const verifyRes = await fetch("https://api.cloudflare.com/client/v4/user/tokens/verify", {
        headers: bearer,
      });
      const verifyBody = await verifyRes.json();
      if (verifyRes.status === 200) {
        baseHeaders = bearer;
        console.log("Token status:", verifyBody.result?.status);
      } else if (hasLegacyAuth) {
        console.log("Token failed; falling back to legacy auth");
        baseHeaders = { "X-Auth-Email": accountEmail, "X-Auth-Key": globalKey };
      } else {
        console.error("Token verification failed. Use API_FIXER to create a deploy token.");
        process.exit(1);
      }
    }
  }

  // 2. Verify account access
  const listRes = await fetch("https://api.cloudflare.com/client/v4/accounts", {
    headers: baseHeaders,
  });
  const listBody = await listRes.json();
  if (listRes.status !== 200) {
    console.log("List accounts:", listRes.status, listBody.errors?.[0]?.message || JSON.stringify(listBody));
    console.error("Auth failed. Check GLOBAL_API_KEY, CLOUDFLARE_ACCOUNT_EMAIL, or API token.");
    process.exit(1);
  }
  const accounts = listBody.result || [];
  console.log("Accounts:", accounts.map((a) => `${a.name} (${a.id})`).join(", ") || "(none)");

  if (accountId) {
    const found = accounts.some((a) => a.id === accountId);
    if (!found) {
      console.error("CLOUDFLARE_ACCOUNT_ID not in your accounts. Use one of:", accounts.map((a) => a.id).join(", "));
      process.exit(1);
    }
  }

  console.log("OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
