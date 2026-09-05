import { describe, it, expect } from "bun:test";
import {
  parseTag,
  formatTag,
  getCategoryColor,
  getTagColor,
  getTagStyle,
  PRESET_TAG_COLORS,
} from "../src/renderer/src/utils/tagColors";

describe("Tag Colors & Category Parsing Utilities", () => {
  it("should parse standard Category:Name tags correctly", () => {
    const parsed = parseTag("Director:Christopher Nolan");
    expect(parsed.category).toBe("Director");
    expect(parsed.name).toBe("Christopher Nolan");
    expect(parsed.full).toBe("Director:Christopher Nolan");
  });

  it("should default untagged raw strings to General category", () => {
    const parsed = parseTag("Epic");
    expect(parsed.category).toBe("General");
    expect(parsed.name).toBe("Epic");
    expect(parsed.full).toBe("General:Epic");
  });

  it("should handle tags with multiple colons properly", () => {
    const parsed = parseTag("Series:Episode 1: The Beginning");
    expect(parsed.category).toBe("Series");
    expect(parsed.name).toBe("Episode 1: The Beginning");
  });

  it("should format category and tag name into standard string", () => {
    expect(formatTag("Actor", "Keanu Reeves")).toBe("Actor:Keanu Reeves");
    expect(formatTag("", "Standalone")).toBe("General:Standalone");
  });

  it("should deterministically assign preset colors to categories", () => {
    const color1 = getCategoryColor("Series");
    const color2 = getCategoryColor("Series");
    expect(color1).toBe(color2);
    expect(PRESET_TAG_COLORS).toContain(color1);
  });

  it("should respect custom category color overrides", () => {
    const customMap = { Series: "#ff0099" };
    const color = getCategoryColor("Series", customMap);
    expect(color).toBe("#ff0099");
  });

  it("should generate valid CSS style objects with alpha channels", () => {
    const style = getTagStyle("#3b82f6");
    expect(style.color).toBe("#3b82f6");
    expect(style.backgroundColor).toBe("#3b82f61b");
    expect(style.borderColor).toBe("#3b82f640");
  });
});
