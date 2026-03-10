#!/usr/bin/env node
/**
 * afterFileEdit hook: optional auto-format placeholder.
 * Reads JSON from stdin, returns { decision, message } on stdout.
 * Can be extended to run prettier/format on edited files.
 */

function emit(decision, message, details) {
  const out = { decision, message };
  if (details && Object.keys(details).length > 0) out.details = details;
  console.log(JSON.stringify(out));
}

function main() {
  let raw = '';
  try {
    raw = require('fs').readFileSync(0, 'utf8');
  } catch {
    emit('allow', 'after-file-edit: no input');
    return;
  }

  try {
    const data = raw.trim() ? JSON.parse(raw) : {};
    // Future: run format on data.filePath or data.files
    emit('allow', 'after-file-edit: pass-through', { fileCount: data.files?.length ?? 1 });
  } catch {
    emit('allow', 'after-file-edit: invalid JSON, pass-through');
  }
}

main();
