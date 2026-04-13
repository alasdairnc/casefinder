import { describe, it, expect } from "vitest";
import { themes } from "../../src/lib/themes.js";

const REQUIRED_KEYS = [
  "bg",
  "bgAlt",
  "text",
  "textSecondary",
  "textTertiary",
  "textFaint",
  "border",
  "borderLight",
  "accent",
  "accentOlive",
  "cardBg",
  "inputBg",
  "buttonBg",
  "buttonText",
];

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(normalized.slice(i, i + 2), 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const fg = luminance(foreground);
  const bg = luminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("themes", () => {
  it("exports both light and dark themes", () => {
    expect(themes).toHaveProperty("light");
    expect(themes).toHaveProperty("dark");
  });

  it("light theme has all required keys", () => {
    for (const key of REQUIRED_KEYS) {
      expect(themes.light).toHaveProperty(key);
    }
  });

  it("dark theme has all required keys", () => {
    for (const key of REQUIRED_KEYS) {
      expect(themes.dark).toHaveProperty(key);
    }
  });

  it("accent color is the same in both themes", () => {
    expect(themes.light.accent).toBe(themes.dark.accent);
  });

  it("light and dark bg colors are different", () => {
    expect(themes.light.bg).not.toBe(themes.dark.bg);
  });

  it.each([
    ["light", themes.light],
    ["dark", themes.dark],
  ])(
    "%s theme keeps readable text contrast on primary surfaces",
    (_, theme) => {
      for (const surface of [theme.bg, theme.bgAlt, theme.cardBg]) {
        expect(contrastRatio(theme.text, surface)).toBeGreaterThanOrEqual(7);
        expect(
          contrastRatio(theme.textSecondary, surface),
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrastRatio(theme.textTertiary, surface),
        ).toBeGreaterThanOrEqual(4.5);
      }
    },
  );
});
