import { describe, expect, it } from "vitest";
import { computeSale, UNDO_WINDOW_MS } from "./actions";

describe("sale rules", () => {
  it("totals qty × negotiated price", () => {
    expect(computeSale(3, 450)).toBe(1350);
  });
  it("rejects zero quantity", () => {
    expect(() => computeSale(0, 500)).toThrow();
  });
  it("undo window is 10 minutes", () => {
    expect(UNDO_WINDOW_MS).toBe(600000);
  });
});
