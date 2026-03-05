import { generateTaskLedger, renderWorkboardMarkdown } from "../../src/governance/taskLedger.js";
import { EntropyReportSchema, TaskLedgerSchema } from "../../src/governance/schemas.js";

describe("governance/taskLedger", () => {
  it("generates schema-valid tasks from entropy findings deterministically", () => {
    const report = EntropyReportSchema.parse({
      version: 1,
      generatedAt: Date.now(),
      score: 42,
      metrics: {
        deadCodeRatio: 0.2,
        redundancyIndex: 0.1,
        abstractionDepthIndex: 0.0,
        depChainLenP95: 2,
        testGapIndex: 0.3,
        churnVolatility: 0.0,
        todoDensity: 1.2,
      },
      breakdown: [],
      findings: [
        {
          id: "dead-aaa",
          category: "dead_code",
          severity: "high",
          title: "Unreachable files",
          evidence: ["src/a.ts", "src/b.ts"],
          suggestedActions: ["delete"],
        },
        {
          id: "dup-bbb",
          category: "redundancy",
          severity: "medium",
          title: "Duplicates",
          evidence: ["src/u1.ts", "src/u2.ts"],
          suggestedActions: ["dedupe"],
        },
      ],
    });

    const ledgerA = generateTaskLedger(report);
    const ledgerB = generateTaskLedger(report);

    // IDs are stable per finding; timestamps differ so compare task IDs only.
    expect(ledgerA.tasks.map((t) => t.id)).toEqual(ledgerB.tasks.map((t) => t.id));

    TaskLedgerSchema.parse(ledgerA);
    const md = renderWorkboardMarkdown(ledgerA);
    expect(md).toContain("Governance Workboard");
    expect(md).toContain("task-dead-aaa");
  });
});

