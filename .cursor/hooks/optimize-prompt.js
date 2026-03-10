#!/usr/bin/env node
/**
 * beforeSubmitPrompt hook: apply model-specific prompt optimization snippets.
 * Reads JSON from stdin, returns { decision, message, details? } on stdout.
 * Does not block; only adds context when a pattern matches.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(__dirname, 'prompt-optimization.json');

function loadConfig() {
  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { patterns: {}, default: null };
  }
}

function getModelName(data) {
  const m = data?.model ?? data?.messages?.[0]?.model ?? data?.request?.model;
  return typeof m === 'string' ? m : null;
}

function matchPattern(modelName, patterns) {
  if (!modelName || !patterns) return null;
  for (const [pattern, snippet] of Object.entries(patterns)) {
    const re = new RegExp(pattern.replace(/\*/g, '.*'));
    if (re.test(modelName)) return snippet;
  }
  return null;
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
    emit('allow', 'optimize-prompt: no input');
    return;
  }

  let data = {};
  try {
    data = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    emit('allow', 'optimize-prompt: invalid JSON, pass-through');
    return;
  }

  const config = loadConfig();
  const modelName = getModelName(data);
  const snippet = matchPattern(modelName, config.patterns) ?? config.default;

  if (!snippet) {
    emit('allow', 'optimize-prompt: no pattern match');
    return;
  }

  emit('allow', 'optimize-prompt: context added', {
    prompt_optimization_hint: snippet,
  });
}

main();
