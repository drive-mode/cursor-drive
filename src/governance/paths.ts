import * as path from "path";

export const GOVERNANCE_DIR = ".drive/governance";

export interface GovernancePaths {
  rootDir: string;
  governanceDir: string;
  snapshotsDir: string;
  reportsDir: string;
  tasksDir: string;
  historyDir: string;
  mermaidDir: string;
}

export function getGovernancePaths(workspaceRoot: string): GovernancePaths {
  const governanceDir = path.join(workspaceRoot, GOVERNANCE_DIR);
  return {
    rootDir: workspaceRoot,
    governanceDir,
    snapshotsDir: path.join(governanceDir, "snapshots"),
    reportsDir: path.join(governanceDir, "reports"),
    tasksDir: path.join(governanceDir, "tasks"),
    historyDir: path.join(governanceDir, "history"),
    mermaidDir: path.join(governanceDir, "mermaid"),
  };
}

