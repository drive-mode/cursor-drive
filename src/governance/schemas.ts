import { z } from "zod";

export const FileKindSchema = z.enum(["src", "test", "doc", "plan", "config", "other"]);
export type FileKind = z.infer<typeof FileKindSchema>;

export const EdgeTypeSchema = z.enum(["import", "testOf", "planOf", "docOf", "configOf"]);
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

export const FileNodeSchema = z.object({
  path: z.string(),
  kind: FileKindSchema,
  loc: z.number().int().nonnegative(),
  imports: z.array(z.string()),
  exports: z.array(z.string()),
  tags: z.array(z.string()),
});
export type FileNode = z.infer<typeof FileNodeSchema>;

export const EdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: EdgeTypeSchema,
});
export type Edge = z.infer<typeof EdgeSchema>;

export const RepoInfoSchema = z.object({
  root: z.string(),
  head: z.string(),
  branch: z.string(),
});
export type RepoInfo = z.infer<typeof RepoInfoSchema>;

export const ProjectGraphSnapshotSchema = z.object({
  version: z.literal(1),
  generatedAt: z.number().int().nonnegative(),
  repo: RepoInfoSchema,
  entrypoints: z.array(z.string()),
  nodes: z.array(FileNodeSchema),
  edges: z.array(EdgeSchema),
  warnings: z.array(z.string()).optional(),
  partial: z.boolean().optional(),
});
export type ProjectGraphSnapshot = z.infer<typeof ProjectGraphSnapshotSchema>;

export const FindingCategorySchema = z.enum([
  "dead_code",
  "redundancy",
  "test_gaps",
  "todo_density",
  "abstraction",
  "dependency_depth",
  "churn",
  "focus",
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

export const FindingSeveritySchema = z.enum(["low", "medium", "high"]);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const FindingSchema = z.object({
  id: z.string(),
  category: FindingCategorySchema,
  severity: FindingSeveritySchema,
  title: z.string(),
  evidence: z.array(z.string()),
  suggestedActions: z.array(z.string()),
  metricImpact: z.record(z.string(), z.number()).optional(),
});
export type Finding = z.infer<typeof FindingSchema>;

export const EntropyMetricsSchema = z.object({
  deadCodeRatio: z.number().min(0).max(1),
  redundancyIndex: z.number().min(0).max(1),
  abstractionDepthIndex: z.number().min(0).max(1),
  depChainLenP95: z.number().min(0),
  testGapIndex: z.number().min(0).max(1),
  churnVolatility: z.number().min(0).max(1),
  todoDensity: z.number().min(0),
});
export type EntropyMetrics = z.infer<typeof EntropyMetricsSchema>;

export const EntropyBreakdownEntrySchema = z.object({
  category: FindingCategorySchema,
  points: z.number().min(0),
  topFindingIds: z.array(z.string()),
});
export type EntropyBreakdownEntry = z.infer<typeof EntropyBreakdownEntrySchema>;

export const EntropyReportSchema = z.object({
  version: z.literal(1),
  generatedAt: z.number().int().nonnegative(),
  score: z.number().int().min(0).max(100),
  metrics: EntropyMetricsSchema,
  breakdown: z.array(EntropyBreakdownEntrySchema),
  findings: z.array(FindingSchema),
  warnings: z.array(z.string()).optional(),
});
export type EntropyReport = z.infer<typeof EntropyReportSchema>;

export const TaskTypeSchema = z.enum(["delete", "refactor", "test", "doc", "investigate"]);
export type TaskType = z.infer<typeof TaskTypeSchema>;

export const TaskPrioritySchema = z.enum(["p0", "p1", "p2"]);
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;

export const EffortBandSchema = z.enum(["xs", "s", "m", "l"]);
export type EffortBand = z.infer<typeof EffortBandSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  type: TaskTypeSchema,
  title: z.string(),
  rootCause: z.string(),
  impact: z.string(),
  recommendedResolution: z.array(z.string()),
  effortBand: EffortBandSchema,
  priority: TaskPrioritySchema,
  riskScore: z.number().int().min(0).max(100),
  evidence: z.array(z.string()),
  sourceFindingId: z.string().optional(),
});
export type Task = z.infer<typeof TaskSchema>;

export const TaskLedgerSchema = z.object({
  version: z.literal(1),
  generatedAt: z.number().int().nonnegative(),
  tasks: z.array(TaskSchema),
});
export type TaskLedger = z.infer<typeof TaskLedgerSchema>;

