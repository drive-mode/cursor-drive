#!/usr/bin/env node
/**
 * stop hook: final validation with summary and warning list.
 * Invokes plan-runner stop, parses output, emits summary + warnings.
 * Returns { decision, message, details: { summary, warnings } } on stdout.
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '..', '..');
const PLAN_RUNNER = path.join(__dirname, 'plan-runner.py');

function emit(decision, message, details) {
  const out = { decision, message };
  if (details && Object.keys(details).length > 0) out.details = details;
  console.log(JSON.stringify(out));
}

function main() {
  const result = spawnSync('pythonw', [PLAN_RUNNER, 'stop'], {
    cwd: ROOT,
    encoding: 'utf8',
    timeout: 60000,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  });

  const warnings = [];
  const summary = [];

  let planOutput = {};
  try {
    const line = (result.stdout || '').trim();
    if (line) planOutput = JSON.parse(line);
  } catch {
    planOutput = { reason: 'plan-runner parse failed' };
  }

  const details = planOutput?.details ?? planOutput;
  if (details?.errors?.length) {
    warnings.push(...details.errors.map((e) => `Error: ${e}`));
  }
  if (details?.warnings?.length) {
    warnings.push(...details.warnings.map((w) => `Warn: ${w}`));
  }
  if (details?.planCount != null) {
    summary.push(`Plans: ${details.planCount}`);
  }
  if (details?.registrySync) {
    summary.push(`Registry: ${details.registrySync.join(', ')}`);
  }
  if (details?.onTodoCompleteBlocked) {
    warnings.push('Completion gate blocked: add ## Reconciliation or fix npm test/compile');
  }

  const decision = warnings.length ? 'warn' : 'allow';
  const message = warnings.length
    ? `final-validation: ${warnings.length} warning(s)`
    : 'final-validation: clean';

  emit(decision, message, {
    summary: summary.length ? summary : ['No summary'],
    warnings: warnings.length ? warnings : [],
  });
}

main();
