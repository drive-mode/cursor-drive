import * as path from "path";
import { runGovernanceScan } from "./scan.js";

type Command = "scan";

function parseArgs(argv: string[]): { command: Command; workspaceRoot: string } {
  const args = argv.slice(2);
  const command = (args[0] as Command | undefined) ?? "scan";
  const workspaceRootFlagIdx = args.indexOf("--root");
  const workspaceRoot = workspaceRootFlagIdx >= 0 && args[workspaceRootFlagIdx + 1]
    ? args[workspaceRootFlagIdx + 1]
    : process.cwd();
  return { command, workspaceRoot: path.resolve(workspaceRoot) };
}

async function runScan(workspaceRoot: string): Promise<void> {
  await runGovernanceScan(workspaceRoot);
  // Minimal console output for scripts
  process.stdout.write("ok\n");
}

export async function main(argv = process.argv): Promise<void> {
  const { command, workspaceRoot } = parseArgs(argv);
  if (command === "scan") {
    await runScan(workspaceRoot);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

// CommonJS entrypoint (tsconfig module=Node16 compiles to CJS in this repo).
if (require.main === module) {
  main().catch((err) => {
    process.stderr.write(String(err?.stack ?? err) + "\n");
    process.exitCode = 1;
  });
}

