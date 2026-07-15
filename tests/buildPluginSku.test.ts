import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { execSync } from "child_process";

/** Mirrors scripts/build-plugin.mjs deletion of marketplace .mcp.json (ADR-0019). */
function omitMarketplaceMcpJson(pluginDir: string): void {
  const mcpPath = path.join(pluginDir, ".mcp.json");
  if (fs.existsSync(mcpPath)) {
    fs.rmSync(mcpPath, { force: true });
  }
}

describe("marketplace plugin SKU", () => {
  it("omitMarketplaceMcpJson removes .mcp.json", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "drive-plugin-sku-"));
    try {
      fs.writeFileSync(path.join(dir, ".mcp.json"), "{}");
      omitMarketplaceMcpJson(dir);
      expect(fs.existsSync(path.join(dir, ".mcp.json"))).toBe(false);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("npm run build:plugin leaves no .cursor-plugin/.mcp.json", () => {
    const root = path.join(__dirname, "..");
    const pluginDir = path.join(root, ".cursor-plugin");
    fs.mkdirSync(pluginDir, { recursive: true });
    const planted = path.join(pluginDir, ".mcp.json");
    fs.writeFileSync(planted, JSON.stringify({ mcpServers: {} }));

    execSync("npm run build:plugin", { cwd: root, stdio: "pipe" });

    expect(fs.existsSync(planted)).toBe(false);
  }, 60_000);
});
