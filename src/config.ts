import * as vscode from "vscode";
import { z } from "zod";

const DisplayModeSchema = z.enum(["tab", "panel", "bottomLog"]);
const DefaultSubModeSchema = z.enum(["plan", "agent", "ask", "debug"]);
const McpPortSchema = z.number().int().min(1024).max(65535);
const PermissionPresetSchema = z.enum(["readonly", "standard", "full"]);

/**
 * Validated Drive settings surface.
 * Mirrors package.json contributes.configuration keys used at runtime.
 */
const DriveConfigSchema = z.object({
  defaultSubMode: DefaultSubModeSchema,
  wakeWord: z.string(),
  sleepWord: z.string(),
  submitWord: z.string(),
  syncNativeMode: z.boolean(),
  mcp: z.object({
    port: McpPortSchema,
    enableApps: z.boolean(),
  }),
  agentScreen: z.object({
    enabled: z.boolean(),
    autoOpen: z.boolean(),
    displayMode: DisplayModeSchema,
    showPlanProgress: z.boolean(),
  }),
  tts: z.object({
    enabled: z.boolean(),
    voice: z.string(),
    speed: z.number().min(0.5).max(2),
    maxSpokenSentences: z.number().int().min(1).max(20),
    interruptOnInput: z.boolean(),
  }),
  operators: z.object({
    maxConcurrent: z.number().int().min(1).max(10),
    maxSubAgentsPerOperator: z.number().int().min(1).max(16),
    defaultPermissionPreset: PermissionPresetSchema,
  }),
  agents: z.object({
    tangentKeyword: z.string(),
    subAgentApproval: z.boolean(),
    autoConfirmTangent: z.boolean(),
    tangentConfirmationTimeout: z.number().int().min(1000).max(60000),
  }),
  privacy: z.object({
    transcriptPersistence: z.boolean(),
  }),
  approvalGates: z.object({
    enabled: z.boolean(),
  }),
  modeSwitching: z.object({
    voiceEnabled: z.boolean(),
    semanticEnabled: z.boolean(),
    requireConfirmation: z.boolean(),
    allowedModes: z.array(DefaultSubModeSchema),
  }),
  cursorCli: z.object({
    command: z.string(),
    timeoutSeconds: z.number().int().min(60).max(3600),
  }),
});

export type DriveConfig = z.infer<typeof DriveConfigSchema>;

function cfg(section?: string): vscode.WorkspaceConfiguration {
  return vscode.workspace.getConfiguration(section ? `cursorDrive.${section}` : "cursorDrive");
}

/**
 * Read validated Drive config from workspace settings.
 * Throws ZodError on invalid values (surface via try/catch at call sites if needed).
 */
export function readConfig(): DriveConfig {
  const root = cfg();
  const mcp = cfg("mcp");
  const agentScreen = cfg("agentScreen");
  const tts = cfg("tts");
  const operators = cfg("operators");
  const agents = cfg("agents");
  const privacy = cfg("privacy");
  const approvalGates = cfg("approvalGates");
  const modeSwitching = cfg("modeSwitching");
  const cursorCli = cfg("cursorCli");

  const raw = {
    defaultSubMode: root.get<string>("defaultSubMode", "agent"),
    wakeWord: root.get<string>("wakeWord", "drive mode"),
    sleepWord: root.get<string>("sleepWord", "park mode"),
    submitWord: root.get<string>("submitWord", "send it"),
    syncNativeMode: root.get<boolean>("syncNativeMode", true),
    mcp: {
      port: mcp.get<number>("port", 7891),
      enableApps: mcp.get<boolean>("enableApps", true),
    },
    agentScreen: {
      enabled: agentScreen.get<boolean>("enabled", true),
      autoOpen: agentScreen.get<boolean>("autoOpen", true),
      displayMode: agentScreen.get<string>("displayMode", "tab"),
      showPlanProgress: agentScreen.get<boolean>("showPlanProgress", true),
    },
    tts: {
      enabled: tts.get<boolean>("enabled", false),
      voice: tts.get<string>("voice", ""),
      speed: tts.get<number>("speed", 1),
      maxSpokenSentences: tts.get<number>("maxSpokenSentences", 3),
      interruptOnInput: tts.get<boolean>("interruptOnInput", true),
    },
    operators: {
      maxConcurrent: operators.get<number>("maxConcurrent", 3),
      maxSubAgentsPerOperator: operators.get<number>("maxSubAgentsPerOperator", 4),
      defaultPermissionPreset: operators.get<string>("defaultPermissionPreset", "standard"),
    },
    agents: {
      tangentKeyword: agents.get<string>("tangentKeyword", "tangent"),
      subAgentApproval: agents.get<boolean>("subAgentApproval", false),
      autoConfirmTangent: agents.get<boolean>("autoConfirmTangent", false),
      tangentConfirmationTimeout: agents.get<number>("tangentConfirmationTimeout", 5000),
    },
    privacy: {
      transcriptPersistence: privacy.get<boolean>("transcriptPersistence", false),
    },
    approvalGates: {
      enabled: approvalGates.get<boolean>("enabled", true),
    },
    modeSwitching: {
      voiceEnabled: modeSwitching.get<boolean>("voiceEnabled", true),
      semanticEnabled: modeSwitching.get<boolean>("semanticEnabled", false),
      requireConfirmation: modeSwitching.get<boolean>("requireConfirmation", true),
      allowedModes: modeSwitching.get<string[]>("allowedModes", ["plan", "agent", "ask", "debug"]),
    },
    cursorCli: {
      command: cursorCli.get<string>("command", "agent"),
      timeoutSeconds: cursorCli.get<number>("timeoutSeconds", 300),
    },
  };

  return DriveConfigSchema.parse(raw);
}

export { DriveConfigSchema };
