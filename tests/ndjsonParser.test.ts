import { NdjsonParser, mapToCliStreamEvent } from "../src/ndjsonParser";

describe("NdjsonParser", () => {
  it("parses a single complete line", () => {
    const parser = new NdjsonParser();
    const results = parser.feed('{"type":"assistant","text":"hello"}\n');
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({ type: "assistant", text: "hello" });
  });

  it("parses multiple lines in one chunk", () => {
    const parser = new NdjsonParser();
    const results = parser.feed('{"type":"user","text":"a"}\n{"type":"assistant","text":"b"}\n');
    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ type: "user" });
    expect(results[1]).toMatchObject({ type: "assistant" });
  });

  it("buffers a partial line and emits it when the next chunk completes it", () => {
    const parser = new NdjsonParser();
    const r1 = parser.feed('{"type":"text_delta","tex');
    expect(r1).toHaveLength(0);
    const r2 = parser.feed('t":"hi"}\n');
    expect(r2).toHaveLength(1);
    expect(r2[0]).toMatchObject({ type: "text_delta", text: "hi" });
  });

  it("skips blank lines without throwing", () => {
    const parser = new NdjsonParser();
    const results = parser.feed('\n\n{"type":"assistant"}\n\n');
    expect(results).toHaveLength(1);
  });

  it("skips malformed JSON without throwing", () => {
    const parser = new NdjsonParser();
    expect(() => {
      const results = parser.feed('not-json\n{"type":"assistant"}\n');
      expect(results).toHaveLength(1);
    }).not.toThrow();
  });

  it("handles multiple partial chunks then final newline", () => {
    const parser = new NdjsonParser();
    parser.feed('{"type"');
    parser.feed(':"tool_call"');
    parser.feed(',"name":"edit_file"}');
    const results = parser.feed('\n');
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ type: "tool_call", name: "edit_file" });
  });

  it("accumulates buffer correctly across many small chunks", () => {
    const parser = new NdjsonParser();
    const line = '{"type":"error","text":"fail"}\n';
    for (let i = 0; i < line.length - 1; i++) {
      const partial = parser.feed(line[i]);
      expect(partial).toHaveLength(0);
    }
    const final = parser.feed(line[line.length - 1]);
    expect(final).toHaveLength(1);
    expect(final[0]).toMatchObject({ type: "error", text: "fail" });
  });
});

describe("mapToCliStreamEvent", () => {
  it("maps tool_call type correctly", () => {
    const event = mapToCliStreamEvent({ type: "tool_call", name: "read_file" });
    expect(event.type).toBe("tool_call");
    expect(event.toolName).toBe("read_file");
  });

  it("maps tool_use type to tool_call", () => {
    const event = mapToCliStreamEvent({ type: "tool_use", name: "write_file" });
    expect(event.type).toBe("tool_call");
    expect(event.toolName).toBe("write_file");
  });

  it("maps assistant role correctly", () => {
    const event = mapToCliStreamEvent({ role: "assistant", content: "Here is my answer." });
    expect(event.type).toBe("assistant");
    expect(event.text).toBe("Here is my answer.");
  });

  it("maps text_delta type correctly", () => {
    const event = mapToCliStreamEvent({ type: "text_delta", text: "streamed token" });
    expect(event.type).toBe("text_delta");
    expect(event.text).toBe("streamed token");
  });

  it("maps content_block_delta to text_delta", () => {
    const event = mapToCliStreamEvent({ type: "content_block_delta", delta: { text: "delta text" } });
    expect(event.type).toBe("text_delta");
    expect(event.text).toBe("delta text");
  });

  it("maps user role correctly", () => {
    const event = mapToCliStreamEvent({ role: "user", content: "user message" });
    expect(event.type).toBe("user");
    expect(event.text).toBe("user message");
  });

  it("maps error type correctly", () => {
    const event = mapToCliStreamEvent({ type: "error", text: "something went wrong" });
    expect(event.type).toBe("error");
    expect(event.text).toBe("something went wrong");
  });

  it("passes through unknown type", () => {
    const event = mapToCliStreamEvent({ type: "ping" });
    expect(event.type).toBe("unknown");
    expect(event.text).toBeUndefined();
  });

  it("extracts toolName from tool_name field", () => {
    const event = mapToCliStreamEvent({ type: "tool_call", tool_name: "bash" });
    expect(event.toolName).toBe("bash");
  });

  it("preserves raw object reference", () => {
    const raw = { type: "assistant", text: "hi" };
    const event = mapToCliStreamEvent(raw);
    expect(event.raw).toBe(raw);
  });

  it("extracts text from delta.text for content_block_delta", () => {
    const raw = { type: "content_block_delta", delta: { type: "text_delta", text: "word " } };
    const event = mapToCliStreamEvent(raw);
    expect(event.type).toBe("text_delta");
    expect(event.text).toBe("word ");
  });
});
