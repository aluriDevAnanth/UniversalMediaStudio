import { describe, it, expect, beforeAll } from "bun:test";
import { isInputElement } from "../src/renderer/src/hooks/useGlobalShortcuts";

describe("Global Shortcuts & Input Element Detection (src/renderer/src/hooks/useGlobalShortcuts.ts)", () => {
  beforeAll(() => {
    if (typeof globalThis.HTMLElement === "undefined") {
      (globalThis as any).HTMLElement = class HTMLElement {
        tagName: string = "";
        isContentEditable: boolean = false;
        blur() {}
      };
    }
  });

  it("should detect input elements correctly", () => {
    const inputEl = Object.assign(new (globalThis as any).HTMLElement(), { tagName: "INPUT" });
    const textareaEl = Object.assign(new (globalThis as any).HTMLElement(), { tagName: "TEXTAREA" });
    const selectEl = Object.assign(new (globalThis as any).HTMLElement(), { tagName: "SELECT" });
    const editableDiv = Object.assign(new (globalThis as any).HTMLElement(), { tagName: "DIV", isContentEditable: true });

    expect(isInputElement(inputEl)).toBe(true);
    expect(isInputElement(textareaEl)).toBe(true);
    expect(isInputElement(selectEl)).toBe(true);
    expect(isInputElement(editableDiv)).toBe(true);
  });

  it("should return false for non-input elements or null", () => {
    const regularDiv = Object.assign(new (globalThis as any).HTMLElement(), { tagName: "DIV", isContentEditable: false });
    const spanEl = Object.assign(new (globalThis as any).HTMLElement(), { tagName: "SPAN", isContentEditable: false });

    expect(isInputElement(null)).toBe(false);
    expect(isInputElement(undefined as any)).toBe(false);
    expect(isInputElement({} as any)).toBe(false);
    expect(isInputElement(regularDiv)).toBe(false);
    expect(isInputElement(spanEl)).toBe(false);
  });
});
