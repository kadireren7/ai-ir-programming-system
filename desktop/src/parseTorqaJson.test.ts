import { describe, expect, it } from "vitest";
import { tryParseTorqaJson } from "./parseTorqaJson";

describe("tryParseTorqaJson", () => {
  it("parses clean stdout", () => {
    const v = tryParseTorqaJson('{"ok":true,"metrics":{"x":1}}\n', "");
    expect(v).toEqual({ ok: true, metrics: { x: 1 } });
  });

  it("parses JSON from stderr when stdout empty (surface / project errors)", () => {
    const err = JSON.stringify({ ok: false, code: "PX_TQ_BAD", message: "bad" });
    const v = tryParseTorqaJson("", err);
    expect(v).toEqual({ ok: false, code: "PX_TQ_BAD", message: "bad" });
  });

  it("extracts object after noise", () => {
    const inner = JSON.stringify({ diagnostics: { ok: true, issues: [] } });
    const v = tryParseTorqaJson(`FutureWarning: foo\n${inner}\ntrailing`, "");
    expect(v).toEqual({ diagnostics: { ok: true, issues: [] } });
  });
});
