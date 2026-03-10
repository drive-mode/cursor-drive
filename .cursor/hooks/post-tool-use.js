#!/usr/bin/env node
/**
 * afterMCPExecution / afterShellExecution hook.
 * Reads JSON from stdin, returns { decision, message, details? } on stdout.
 * Logs tool use when tool-policy.json logToolUse is true.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'tool-policy.json');

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { logToolUse: true };
  }
}

function emit(decision, message, details) {
  const out = { decision, message };
  if (details && Object.keys(details).length > 0) out.details = details;
  console.log(JSON.stringify(out));
}

function main() {
  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {
    emit('allow', 'post-tool-use: no input');
    return;
  }

  let data = {};
  try {
    data = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    emit('allow', 'post-tool-use: invalid JSON, pass-through');
    return;
  }

  const config = loadConfig();
  const toolName = data?.toolName ?? data?.tool ?? data?.command ?? '';

  if (config.logToolUse) {
    emit('allow', 'post-tool-use: logged', { tool: toolName });
  } else {
    emit('allow', 'post-tool-use: pass-through');
  }
}

main();
