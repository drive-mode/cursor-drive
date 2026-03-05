import * as path from "path";
import { appendNdjsonLine, ensureDir, writeJsonAtomic, writeTextAtomic } from "./fsUtils.js";
import { getGovernancePaths } from "./paths.js";
import { buildProjectGraphSnapshot } from "./projectGraph.js";
import { computeEntropyReport, renderEntropyMarkdown } from "./entropy.js";
import { generateTaskLedger, renderWorkboardMarkdown } from "./taskLedger.js";
import { EntropyReportSchema, ProjectGraphSnapshotSchema, TaskLedgerSchema } from "./schemas.js";

export interface GovernanceScanArtifacts {
  projectGraphJson: string;
  entropyJson: string;
  entropyMd: string;
  taskLedgerJson: string;
  workboardMd: string;
  entropyHistoryNdjson: string;
}

export interface GovernanceScanSummary {
  entropyScore: number;
  taskCount: number;
  warnings: string[];
}

export async function runGovernanceScan(workspaceRoot: string): Promise<{
  artifacts: GovernanceScanArtifacts;
  summary: GovernanceScanSummary;
}> {
  const gp = getGovernancePaths(workspaceRoot);

  await ensureDir(gp.snapshotsDir);
  await ensureDir(gp.reportsDir);
  await ensureDir(gp.tasksDir);
  await ensureDir(gp.historyDir);

  const snapshot = await buildProjectGraphSnapshot(workspaceRoot);
  ProjectGraphSnapshotSchema.parse(snapshot);

  const entropy = await computeEntropyReport(snapshot, workspaceRoot);
  EntropyReportSchema.parse(entropy);

  const ledger = generateTaskLedger(entropy);
  TaskLedgerSchema.parse(ledger);

  const artifacts: GovernanceScanArtifacts = {
    projectGraphJson: path.join(gp.snapshotsDir, "project-graph.latest.json"),
    entropyJson: path.join(gp.reportsDir, "entropy.latest.json"),
    entropyMd: path.join(gp.reportsDir, "entropy.latest.md"),
    taskLedgerJson: path.join(gp.tasksDir, "task-ledger.latest.json"),
    workboardMd: path.join(gp.tasksDir, "workboard.latest.md"),
    entropyHistoryNdjson: path.join(gp.historyDir, "entropy.ndjson"),
  };

  await writeJsonAtomic(artifacts.projectGraphJson, snapshot);
  await writeJsonAtomic(artifacts.entropyJson, entropy);
  await writeTextAtomic(artifacts.entropyMd, renderEntropyMarkdown(entropy));
  await writeJsonAtomic(artifacts.taskLedgerJson, ledger);
  await writeTextAtomic(artifacts.workboardMd, renderWorkboardMarkdown(ledger));

  await appendNdjsonLine(artifacts.entropyHistoryNdjson, {
    generatedAt: entropy.generatedAt,
    score: entropy.score,
    metrics: entropy.metrics,
  });

  const summary: GovernanceScanSummary = {
    entropyScore: entropy.score,
    taskCount: ledger.tasks.length,
    warnings: [...(snapshot.warnings ?? []), ...(entropy.warnings ?? [])],
  };

  return { artifacts, summary };
}

