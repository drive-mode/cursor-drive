/**
 * Cursor Cloud Agents API client.
 * Uses Node 20 native fetch(). Auth: Basic (default) or Bearer with 401/403 fallback retry.
 */

export class CloudAgentError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly endpoint: string
  ) {
    super(message);
    this.name = "CloudAgentError";
  }
}

export interface LaunchAgentParams {
  repository: string;
  prompt: string;
  branch?: string;
  model?: string;
}

export interface LaunchAgentResult {
  agentId: string;
  status: string;
  dashboardUrl?: string;
  prUrl?: string;
}

export interface GetAgentStatusResult {
  status: string;
  prUrl?: string;
  summary?: string;
}

export interface ConversationMessage {
  role: "user" | "assistant";
  text: string;
}

export interface GetAgentConversationResult {
  messages: ConversationMessage[];
}

export interface AgentArtifact {
  absolutePath: string;
  sizeBytes: number;
  updatedAt: string;
}

export interface GetAgentArtifactsResult {
  artifacts: AgentArtifact[];
}

export interface CloudAgentClientConfig {
  apiBaseUrl: string;
  apiKey: string;
  authMode?: "basic" | "bearer";
}

function toRepositoryUrl(slug: string): string {
  if (slug.startsWith("https://") || slug.startsWith("http://")) {
    return slug;
  }
  return `https://github.com/${slug}`;
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

async function fetchWithAuth(
  url: string,
  options: RequestInit,
  apiKey: string,
  authMode: "basic" | "bearer"
): Promise<Response> {
  const headers = new Headers(options.headers);
  if (authMode === "basic") {
    const encoded = Buffer.from(`${apiKey}:`, "utf-8").toString("base64");
    headers.set("Authorization", `Basic ${encoded}`);
  } else {
    headers.set("Authorization", `Bearer ${apiKey}`);
  }
  let lastRes: Response | undefined;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    lastRes = await fetch(url, { ...options, headers });
    if (!lastRes.ok && isRetryableStatus(lastRes.status) && attempt < MAX_RETRIES) {
      const delay = INITIAL_BACKOFF_MS * Math.pow(2, attempt);
      await new Promise((r) => setTimeout(r, delay));
      continue;
    }
    return lastRes;
  }
  return lastRes!;
}

export async function launchAgent(
  params: LaunchAgentParams,
  config: CloudAgentClientConfig
): Promise<LaunchAgentResult> {
  const base = config.apiBaseUrl.replace(/\/$/, "");
  const url = `${base}/v0/agents`;
  const authMode = config.authMode ?? "basic";

  const body = {
    prompt: { text: params.prompt },
    source: {
      repository: toRepositoryUrl(params.repository),
      ...(params.branch && { ref: params.branch }),
    },
    ...(params.model && { model: params.model }),
  };

  let res = await fetchWithAuth(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    config.apiKey,
    authMode
  );

  if ((res.status === 401 || res.status === 403) && authMode === "basic") {
    const fallbackRes = await fetchWithAuth(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
      config.apiKey,
      "bearer"
    );
    res = fallbackRes;
  }

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `Cloud Agent API error ${res.status} at ${url}`;
    try {
      const parsed = JSON.parse(errBody);
      msg = parsed?.error?.message ?? msg;
    } catch {
      if (errBody) msg += `: ${errBody.slice(0, 200)}`;
    }
    throw new CloudAgentError(msg, res.status, url);
  }

  const data = (await res.json()) as {
    id?: string;
    status?: string;
    target?: { url?: string; prUrl?: string };
  };

  return {
    agentId: data.id ?? "",
    status: (data.status ?? "CREATING").toLowerCase(),
    dashboardUrl: data.target?.url,
    prUrl: data.target?.prUrl,
  };
}

export async function getAgentStatus(
  agentId: string,
  config: CloudAgentClientConfig
): Promise<GetAgentStatusResult> {
  const base = config.apiBaseUrl.replace(/\/$/, "");
  const url = `${base}/v0/agents/${encodeURIComponent(agentId)}`;
  const authMode = config.authMode ?? "basic";

  let res = await fetchWithAuth(
    url,
    { method: "GET", headers: {} },
    config.apiKey,
    authMode
  );

  if ((res.status === 401 || res.status === 403) && authMode === "basic") {
    res = await fetchWithAuth(
      url,
      { method: "GET", headers: {} },
      config.apiKey,
      "bearer"
    );
  }

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `Cloud Agent API error ${res.status} at ${url}`;
    try {
      const parsed = JSON.parse(errBody);
      msg = parsed?.error?.message ?? msg;
    } catch {
      if (errBody) msg += `: ${errBody.slice(0, 200)}`;
    }
    throw new CloudAgentError(msg, res.status, url);
  }

  const data = (await res.json()) as {
    status?: string;
    target?: { prUrl?: string };
    summary?: string;
  };

  return {
    status: (data.status ?? "unknown").toLowerCase(),
    prUrl: data.target?.prUrl,
    summary: data.summary,
  };
}

export async function getAgentConversation(
  agentId: string,
  config: CloudAgentClientConfig
): Promise<GetAgentConversationResult> {
  const base = config.apiBaseUrl.replace(/\/$/, "");
  const url = `${base}/v0/agents/${encodeURIComponent(agentId)}/conversation`;
  const authMode = config.authMode ?? "basic";

  let res = await fetchWithAuth(
    url,
    { method: "GET", headers: {} },
    config.apiKey,
    authMode
  );

  if ((res.status === 401 || res.status === 403) && authMode === "basic") {
    res = await fetchWithAuth(
      url,
      { method: "GET", headers: {} },
      config.apiKey,
      "bearer"
    );
  }

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `Cloud Agent API error ${res.status} at ${url}`;
    try {
      const parsed = JSON.parse(errBody);
      msg = parsed?.error?.message ?? msg;
    } catch {
      if (errBody) msg += `: ${errBody.slice(0, 200)}`;
    }
    throw new CloudAgentError(msg, res.status, url);
  }

  const data = (await res.json()) as { messages?: Array<{ role?: string; text?: string }> };
  const messages: ConversationMessage[] = (data.messages ?? []).map((m) => ({
    role: (m.role === "user" ? "user" : "assistant") as "user" | "assistant",
    text: m.text ?? "",
  }));

  return { messages };
}

export async function getAgentArtifacts(
  agentId: string,
  config: CloudAgentClientConfig
): Promise<GetAgentArtifactsResult> {
  const base = config.apiBaseUrl.replace(/\/$/, "");
  const url = `${base}/v0/agents/${encodeURIComponent(agentId)}/artifacts`;
  const authMode = config.authMode ?? "basic";

  let res = await fetchWithAuth(
    url,
    { method: "GET", headers: {} },
    config.apiKey,
    authMode
  );

  if ((res.status === 401 || res.status === 403) && authMode === "basic") {
    res = await fetchWithAuth(
      url,
      { method: "GET", headers: {} },
      config.apiKey,
      "bearer"
    );
  }

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `Cloud Agent API error ${res.status} at ${url}`;
    try {
      const parsed = JSON.parse(errBody);
      msg = parsed?.error?.message ?? msg;
    } catch {
      if (errBody) msg += `: ${errBody.slice(0, 200)}`;
    }
    throw new CloudAgentError(msg, res.status, url);
  }

  const data = (await res.json()) as {
    artifacts?: Array<{ absolutePath?: string; sizeBytes?: number; updatedAt?: string }>;
  };
  const artifacts: AgentArtifact[] = (data.artifacts ?? []).map((a) => ({
    absolutePath: a.absolutePath ?? "",
    sizeBytes: a.sizeBytes ?? 0,
    updatedAt: a.updatedAt ?? "",
  }));

  return { artifacts };
}

export async function getArtifactDownloadUrl(
  agentId: string,
  absolutePath: string,
  config: CloudAgentClientConfig
): Promise<{ url: string }> {
  const base = config.apiBaseUrl.replace(/\/$/, "");
  const url = `${base}/v0/agents/${encodeURIComponent(agentId)}/artifacts/download?path=${encodeURIComponent(absolutePath)}`;
  const authMode = config.authMode ?? "basic";

  let res = await fetchWithAuth(
    url,
    { method: "GET", headers: {} },
    config.apiKey,
    authMode
  );

  if ((res.status === 401 || res.status === 403) && authMode === "basic") {
    res = await fetchWithAuth(
      url,
      { method: "GET", headers: {} },
      config.apiKey,
      "bearer"
    );
  }

  if (!res.ok) {
    const errBody = await res.text();
    let msg = `Cloud Agent API error ${res.status} at ${url}`;
    try {
      const parsed = JSON.parse(errBody);
      msg = parsed?.error?.message ?? msg;
    } catch {
      if (errBody) msg += `: ${errBody.slice(0, 200)}`;
    }
    throw new CloudAgentError(msg, res.status, url);
  }

  const data = (await res.json()) as { url?: string };
  return { url: data.url ?? "" };
}
