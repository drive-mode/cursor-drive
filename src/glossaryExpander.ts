import * as vscode from "vscode";

export interface GlossaryEntry {
  trigger: string;
  expansion: string;
  /** Precompiled regex for matching trigger (set when loading). */
  regex?: RegExp;
}

export interface GlossaryExpandResult {
  expanded: string;
  original: string;
  wasExpanded: boolean;
  matchedTriggers: string[];
}

const WS_COLLAPSE_RE = /\s{2,}/g;

const BUILTIN_GLOSSARY: GlossaryEntry[] = [
  { trigger: "tangent", expansion: "tangent — spawn a parallel agent for" },
  { trigger: "hey drive", expansion: "" }, // activation phrase — strip it
  { trigger: "send it", expansion: "" }, // submit phrase — strip it
  { trigger: "go ahead", expansion: "proceed and implement" },
  { trigger: "send", expansion: "" }, // common submit word — strip
];

let glossaryCache: GlossaryEntry[] | null = null;

vscode.workspace.onDidChangeConfiguration((e) => {
  if (e.affectsConfiguration("cursorDrive.glossary")) {
    glossaryCache = null;
  }
});

function compileTriggerRegex(trigger: string): RegExp {
  const escaped = trigger.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\b)${escaped}(?:\\b|$)`, "gi");
}

export function loadGlossary(): GlossaryEntry[] {
  if (glossaryCache) { return glossaryCache; }
  const cfg = vscode.workspace.getConfiguration("cursorDrive");
  const userEntries = cfg.get<GlossaryEntry[]>("glossary", []);
  const all = [...userEntries, ...BUILTIN_GLOSSARY];
  glossaryCache = all.map((e) => ({
    ...e,
    regex: e.trigger.trim() ? compileTriggerRegex(e.trigger) : undefined,
  }));
  return glossaryCache;
}

export function expandGlossary(
  text: string,
  glossary?: GlossaryEntry[]
): GlossaryExpandResult {
  const entries = glossary ?? loadGlossary();
  const original = text;
  const matched: string[] = [];

  // Sort by trigger length descending so longer phrases match before shorter substrings.
  const sorted = [...entries].sort((a, b) => b.trigger.length - a.trigger.length);

  let result = text;
  for (const entry of sorted) {
    const re = entry.regex;
    if (!re) { continue; }
    re.lastIndex = 0;
    if (re.test(result)) {
      matched.push(entry.trigger);
      re.lastIndex = 0;
      result = result.replace(re, entry.expansion);
    }
  }

  // Collapse extra whitespace introduced by empty-expansion strips.
  WS_COLLAPSE_RE.lastIndex = 0;
  result = result.replace(WS_COLLAPSE_RE, " ").trim();

  return {
    expanded: result,
    original,
    wasExpanded: matched.length > 0,
    matchedTriggers: matched,
  };
}
