import * as vscode from "vscode";
import { z } from "zod";

const DisplayModeSchema = z.enum(["tab", "panel", "bottomLog"]);
const DefaultSubModeSchema = z.enum(["plan", "agent", "ask", "debug"]);
const McpPortSchema = z.number().int().min(1024).max(65535);

const DriveConfigSchema = z.object({
  mcp: z.object({ port: McpPortSchema }),
  agentScreen: z.object({ displayMode: DisplayModeSchema }),
  defaultSubMode: DefaultSubModeSchema,
});

export type DriveConfig = z.infer<typeof DriveConfigSchema>;

/**
 * Read validated Drive config from workspace settings.
 * Modules may still use getConfiguration directly until full migration.
 */
export function readConfig(): DriveConfig {
  const cfg = vscode.workspace.getConfiguration("cursorDrive");
  const mcpCfg = vscode.workspace.getConfiguration("cursorDrive.mcp");
  const agentScreenCfg = vscode.workspace.getConfiguration("cursorDrive.agentScreen");

  const raw = {
    mcp: { port: mcpCfg.get<number>("port", 7891) },
    agentScreen: { displayMode: agentScreenCfg.get<string>("displayMode", "tab") },
    defaultSubMode: cfg.get<string>("defaultSubMode", "agent"),
  };

  return DriveConfigSchema.parse(raw);
}
