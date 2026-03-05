import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";
import { SyncLedger } from "../src/syncLedger";
import { makeSyncProposal } from "./syncTypes.test";

describe("SyncLedger", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "sync-ledger-test-"));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  describe("proposals", () => {
    it("saves and loads a proposal", async () => {
      const ledger = new SyncLedger(tmpDir);
      const proposal = makeSyncProposal({ id: "p-1" });

      await ledger.saveProposal(proposal);
      const loaded = await ledger.loadProposals();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe("p-1");
      expect(loaded[0].status).toBe("pending_review");
    });

    it("persists proposals across instances (restart-safe)", async () => {
      const ledger1 = new SyncLedger(tmpDir);
      await ledger1.saveProposal(makeSyncProposal({ id: "p-1" }));
      await ledger1.saveProposal(makeSyncProposal({ id: "p-2" }));

      // New instance loads from disk
      const ledger2 = new SyncLedger(tmpDir);
      const loaded = await ledger2.loadProposals();

      expect(loaded).toHaveLength(2);
      expect(loaded.map((p) => p.id).sort()).toEqual(["p-1", "p-2"]);
    });

    it("updates proposal status", async () => {
      const ledger = new SyncLedger(tmpDir);
      await ledger.saveProposal(makeSyncProposal({ id: "p-1" }));

      const updated = await ledger.updateProposalStatus("p-1", "approved", {
        decidedAt: 1700001000,
      });

      expect(updated?.status).toBe("approved");
      expect(updated?.decidedAt).toBe(1700001000);

      // Verify persisted
      const ledger2 = new SyncLedger(tmpDir);
      const loaded = await ledger2.loadProposals();
      expect(loaded[0].status).toBe("approved");
    });

    it("returns undefined when updating nonexistent proposal", async () => {
      const ledger = new SyncLedger(tmpDir);
      const result = await ledger.updateProposalStatus("nonexistent", "approved");
      expect(result).toBeUndefined();
    });

    it("getProposal returns a copy by ID", async () => {
      const ledger = new SyncLedger(tmpDir);
      await ledger.saveProposal(makeSyncProposal({ id: "p-1" }));

      const found = await ledger.getProposal("p-1");
      expect(found?.id).toBe("p-1");

      const notFound = await ledger.getProposal("nonexistent");
      expect(notFound).toBeUndefined();
    });

    it("overwrites proposal with same ID", async () => {
      const ledger = new SyncLedger(tmpDir);
      await ledger.saveProposal(makeSyncProposal({ id: "p-1", status: "pending_review" }));
      await ledger.saveProposal(makeSyncProposal({ id: "p-1", status: "approved" }));

      const loaded = await ledger.loadProposals();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].status).toBe("approved");
    });

    it("handles empty state gracefully", async () => {
      const ledger = new SyncLedger(tmpDir);
      const loaded = await ledger.loadProposals();
      expect(loaded).toEqual([]);
    });
  });

  describe("decisions", () => {
    it("appends and reads decisions", async () => {
      const ledger = new SyncLedger(tmpDir);

      await ledger.appendDecision("p-1", "approved", 1700000000, "user");
      await ledger.appendDecision("p-1", "applied", 1700001000);

      const history = await ledger.getDecisionHistory();
      expect(history).toHaveLength(2);
      expect(history[0]).toEqual({
        proposalId: "p-1",
        action: "approved",
        timestamp: 1700000000,
        actor: "user",
      });
      expect(history[1]).toEqual({
        proposalId: "p-1",
        action: "applied",
        timestamp: 1700001000,
      });
    });

    it("decisions persist across instances", async () => {
      const ledger1 = new SyncLedger(tmpDir);
      await ledger1.appendDecision("p-1", "approved", 1700000000);

      const ledger2 = new SyncLedger(tmpDir);
      await ledger2.appendDecision("p-2", "rejected", 1700002000);

      const history = await ledger2.getDecisionHistory();
      expect(history).toHaveLength(2);
    });

    it("returns empty array when no decisions file exists", async () => {
      const ledger = new SyncLedger(tmpDir);
      const history = await ledger.getDecisionHistory();
      expect(history).toEqual([]);
    });
  });
});
