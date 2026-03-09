import {
  launchAgent,
  getAgentStatus,
  getAgentConversation,
  getAgentArtifacts,
  getArtifactDownloadUrl,
  CloudAgentError,
} from "../src/cloudAgentClient";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
});

afterAll(() => {
  (globalThis as { fetch?: typeof fetch }).fetch = originalFetch;
});

describe("cloudAgentClient", () => {
  const config = {
    apiBaseUrl: "https://api.cursor.com",
    apiKey: "test-key",
  };

  describe("launchAgent", () => {
    it("returns agentId and status on 201", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () =>
          Promise.resolve({
            id: "bc_abc123",
            status: "CREATING",
            target: { url: "https://cursor.com/agents?id=bc_abc123", prUrl: "https://github.com/org/repo/pull/1" },
          }),
      });

      const result = await launchAgent(
        { repository: "org/repo", prompt: "Add README" },
        config
      );

      expect(result.agentId).toBe("bc_abc123");
      expect(result.status).toBe("creating");
      expect(result.dashboardUrl).toBe("https://cursor.com/agents?id=bc_abc123");
      expect(result.prUrl).toBe("https://github.com/org/repo/pull/1");
    });

    it("converts owner/repo slug to full GitHub URL", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: "bc_xyz", status: "CREATING", target: {} }),
      });
      (globalThis as { fetch?: typeof fetch }).fetch = mockFetch;

      await launchAgent(
        { repository: "owner/repo", prompt: "Fix bug" },
        config
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.source.repository).toBe("https://github.com/owner/repo");
    });

    it("passes full URL through when repository is already a URL", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: "bc_xyz", status: "CREATING", target: {} }),
      });
      (globalThis as { fetch?: typeof fetch }).fetch = mockFetch;

      await launchAgent(
        { repository: "https://github.com/org/repo", prompt: "Fix" },
        config
      );

      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.source.repository).toBe("https://github.com/org/repo");
    });

    it("falls back to bearer auth on 401 when using basic", async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 401,
          text: () => Promise.resolve(JSON.stringify({ error: { message: "Unauthorized" } })),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: () => Promise.resolve({ id: "bc_retry", status: "CREATING", target: {} }),
        });
      (globalThis as { fetch?: typeof fetch }).fetch = mockFetch;

      const result = await launchAgent(
        { repository: "org/repo", prompt: "Test" },
        { ...config, authMode: "basic" }
      );

      expect(result.agentId).toBe("bc_retry");
      expect(mockFetch).toHaveBeenCalledTimes(2);
      const getAuth = (i: number) => {
        const h = mockFetch.mock.calls[i]?.[1]?.headers;
        return h instanceof Headers ? h.get("Authorization") : (h as Record<string, string>)?.Authorization;
      };
      expect(getAuth(0)).toMatch(/^Basic /);
      expect(getAuth(1)).toMatch(/^Bearer /);
    });

    it("throws CloudAgentError on 401 when bearer also fails", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ error: { message: "Invalid API key" } })),
      });

      const err = await launchAgent(
        { repository: "org/repo", prompt: "Test" },
        { ...config, authMode: "bearer" }
      ).catch((e) => e);

      expect(err).toBeInstanceOf(CloudAgentError);
      expect(err.status).toBe(401);
      expect(err.endpoint).toContain("/v0/agents");
    });

    it("throws CloudAgentError on 404", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify({ error: { message: "Not found" } })),
      });

      await expect(
        launchAgent({ repository: "org/repo", prompt: "Test" }, config)
      ).rejects.toThrow(CloudAgentError);
    });

    it("throws CloudAgentError on 429", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve(JSON.stringify({ error: { message: "Rate limit exceeded" } })),
      });

      const err = await launchAgent(
        { repository: "org/repo", prompt: "Test" },
        config
      ).catch((e) => e);
      expect(err).toBeInstanceOf(CloudAgentError);
      expect(err.status).toBe(429);
    });

    it("throws CloudAgentError on 500", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });

      const err = await launchAgent(
        { repository: "org/repo", prompt: "Test" },
        config
      ).catch((e) => e);
      expect(err).toBeInstanceOf(CloudAgentError);
      expect(err.status).toBe(500);
    });

    it("uses custom base URL from config", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: "bc_custom", status: "CREATING", target: {} }),
      });
      (globalThis as { fetch?: typeof fetch }).fetch = mockFetch;

      await launchAgent(
        { repository: "org/repo", prompt: "Test" },
        { ...config, apiBaseUrl: "https://custom.api.example.com" }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://custom.api.example.com/v0/agents",
        expect.any(Object)
      );
    });
  });

  describe("getAgentStatus", () => {
    it("returns status and prUrl on 200", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: "RUNNING",
            target: { prUrl: "https://github.com/org/repo/pull/2" },
            summary: "Working on README",
          }),
      });

      const result = await getAgentStatus("bc_xyz", config);

      expect(result.status).toBe("running");
      expect(result.prUrl).toBe("https://github.com/org/repo/pull/2");
      expect(result.summary).toBe("Working on README");
    });

    it("returns completed state", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: "FINISHED",
            target: { prUrl: "https://github.com/org/repo/pull/3" },
            summary: "Added README",
          }),
      });

      const result = await getAgentStatus("bc_done", config);

      expect(result.status).toBe("finished");
      expect(result.summary).toBe("Added README");
    });

    it("throws CloudAgentError on 404", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify({ error: { message: "Agent not found" } })),
      });

      await expect(getAgentStatus("nonexistent", config)).rejects.toThrow(CloudAgentError);
    });

    it("falls back to bearer on 403 when using basic", async () => {
      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          text: () => Promise.resolve("Forbidden"),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ status: "RUNNING", target: {} }),
        });
      (globalThis as { fetch?: typeof fetch }).fetch = mockFetch;

      const result = await getAgentStatus("bc_xyz", { ...config, authMode: "basic" });

      expect(result.status).toBe("running");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("getAgentConversation", () => {
    it("returns messages array", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            messages: [
              { role: "user", text: "Add a README" },
              { role: "assistant", text: "I'll add a README.md file." },
            ],
          }),
      });

      const result = await getAgentConversation("bc_conv", config);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0]).toEqual({ role: "user", text: "Add a README" });
      expect(result.messages[1]).toEqual({ role: "assistant", text: "I'll add a README.md file." });
    });

    it("throws CloudAgentError on network failure", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest
        .fn()
        .mockRejectedValue(new Error("Network error"));

      await expect(getAgentConversation("bc_conv", config)).rejects.toThrow();
    });

    it("throws CloudAgentError on 500", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Server error"),
      });

      const err = await getAgentConversation("bc_conv", config).catch((e) => e);
      expect(err).toBeInstanceOf(CloudAgentError);
      expect(err.status).toBe(500);
    });
  });

  describe("getAgentArtifacts", () => {
    it("returns artifacts array with absolutePath, sizeBytes, updatedAt", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            artifacts: [
              { absolutePath: "/opt/cursor/artifacts/screenshot.png", sizeBytes: 12345, updatedAt: "2024-01-15T11:02:00.000Z" },
              { absolutePath: "/opt/cursor/artifacts/demo.mp4", sizeBytes: 67890, updatedAt: "2024-01-15T11:03:10.000Z" },
            ],
          }),
      });

      const result = await getAgentArtifacts("bc_artifacts", config);

      expect(result.artifacts).toHaveLength(2);
      expect(result.artifacts[0]).toEqual({
        absolutePath: "/opt/cursor/artifacts/screenshot.png",
        sizeBytes: 12345,
        updatedAt: "2024-01-15T11:02:00.000Z",
      });
      expect(result.artifacts[1].absolutePath).toBe("/opt/cursor/artifacts/demo.mp4");
    });

    it("returns empty array when no artifacts", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ artifacts: [] }),
      });

      const result = await getAgentArtifacts("bc_empty", config);

      expect(result.artifacts).toEqual([]);
    });

    it("throws CloudAgentError on 404", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify({ error: { message: "Agent not found" } })),
      });

      await expect(getAgentArtifacts("nonexistent", config)).rejects.toThrow(CloudAgentError);
    });
  });

  describe("getArtifactDownloadUrl", () => {
    it("returns presigned URL for artifact path", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            url: "https://cloud-agent-artifacts.s3.us-east-1.amazonaws.com/presigned-path?X-Amz-...",
          }),
      });

      const result = await getArtifactDownloadUrl(
        "bc_artifacts",
        "/opt/cursor/artifacts/screenshot.png",
        config
      );

      expect(result.url).toContain("cloud-agent-artifacts.s3.us-east-1.amazonaws.com");
    });

    it("encodes path in query parameter", async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ url: "https://example.com/artifact" }),
      });
      (globalThis as { fetch?: typeof fetch }).fetch = mockFetch;

      await getArtifactDownloadUrl("bc_id", "/opt/cursor/artifacts/file with spaces.png", config);

      const callUrl = mockFetch.mock.calls[0][0] as string;
      expect(callUrl).toContain("path=");
      expect(callUrl).toContain(encodeURIComponent("/opt/cursor/artifacts/file with spaces.png"));
    });

    it("throws CloudAgentError on 404", async () => {
      (globalThis as { fetch?: typeof fetch }).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        text: () => Promise.resolve(JSON.stringify({ error: { message: "Artifact not found" } })),
      });

      await expect(
        getArtifactDownloadUrl("bc_id", "/opt/cursor/artifacts/missing.png", config)
      ).rejects.toThrow(CloudAgentError);
    });
  });
});
