export type McpDeepLinkInput = {
  name: string;
  url: string;
};

/** Build a Cursor MCP install deeplink URI string (no vscode dependency). */
export function buildMcpInstallDeepLink(input: McpDeepLinkInput): string {
  const config = JSON.stringify({ url: input.url });
  const b64 = Buffer.from(config).toString("base64");
  return `cursor://anysphere.cursor-deeplink/mcp/install?name=${encodeURIComponent(input.name)}&config=${encodeURIComponent(b64)}`;
}
