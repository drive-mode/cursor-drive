import { cleanFillerWords, looksLikeDictation } from "../src/fillerCleaner";

describe("cleanFillerWords", () => {
  it("returns original for empty string", () => {
    const r = cleanFillerWords("");
    expect(r.cleaned).toBe("");
    expect(r.wasModified).toBe(false);
  });

  it("returns original for whitespace-only string", () => {
    const r = cleanFillerWords("   ");
    expect(r.wasModified).toBe(false);
  });

  it("removes standalone filler words", () => {
    const r = cleanFillerWords("uhh add a login page");
    expect(r.cleaned).not.toMatch(/\buhh\b/i);
    expect(r.cleaned).toContain("login page");
    expect(r.wasModified).toBe(true);
  });

  it("removes 'um' and 'uh' variants", () => {
    const r = cleanFillerWords("um uh can you refactor this umm please");
    expect(r.cleaned).not.toMatch(/\bu[hm]+\b/i);
    expect(r.wasModified).toBe(true);
  });

  it("collapses duplicate adjacent words", () => {
    const r = cleanFillerWords("can you can you fix the bug");
    expect(r.cleaned).not.toMatch(/can you can you/i);
    expect(r.wasModified).toBe(true);
  });

  it("preserves sentence casing when original starts uppercase", () => {
    const r = cleanFillerWords("Uhh add a test");
    expect(r.cleaned[0]).toBe(r.cleaned[0].toUpperCase());
  });

  it("passes through clean text without modification", () => {
    const r = cleanFillerWords("Refactor the auth module");
    expect(r.wasModified).toBe(false);
    expect(r.cleaned).toBe("Refactor the auth module");
  });

  it("removes 'i mean' mid-sentence", () => {
    const r = cleanFillerWords("add a test i mean for the auth module");
    expect(r.cleaned).not.toMatch(/i mean/i);
    expect(r.wasModified).toBe(true);
  });

  it("populates original field", () => {
    const raw = "uhh fix the bug";
    const r = cleanFillerWords(raw);
    expect(r.original).toBe(raw);
  });

  it("falls back to original when cleaning would produce empty string", () => {
    const r = cleanFillerWords("uhh umm");
    expect(r.cleaned.length).toBeGreaterThan(0);
  });
});

describe("looksLikeDictation", () => {
  it("detects filler-heavy text", () => {
    expect(looksLikeDictation("uhh umm like maybe add this")).toBe(true);
  });

  it("does not flag clean technical text", () => {
    expect(looksLikeDictation("Refactor the authentication module to use JWT")).toBe(false);
  });
});
