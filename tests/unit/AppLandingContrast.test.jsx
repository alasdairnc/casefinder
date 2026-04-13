// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import App from "../../src/App.jsx";
import { themes } from "../../src/lib/themes.js";

function parseCssColor(color) {
  if (color.startsWith("#")) {
    const normalized = color.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(normalized.slice(i, i + 2), 16) / 255);
  }

  const match = color.match(/\d+(\.\d+)?/g);
  if (!match || match.length < 3) {
    throw new Error(`Unsupported color format: ${color}`);
  }

  return match.slice(0, 3).map((channel) => Number(channel) / 255);
}

function luminance(color) {
  const [r, g, b] = parseCssColor(color).map((channel) =>
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

function expectReadable(element, background) {
  const color = getComputedStyle(element).color;
  expect(contrastRatio(color, background)).toBeGreaterThanOrEqual(4.5);
}

describe("App landing contrast", () => {
  it("keeps low-emphasis landing text readable in light and dark mode", () => {
    render(<App />);

    const exampleLabel = screen.getByText("Try an example");
    const helperCopy = screen.getByText(
      "Educational tool only — not legal advice. Always consult a qualified lawyer. Citations verified against CanLII where possible.",
    );
    const toggleToDark = screen.getByRole("button", { name: "Dark" });

    expectReadable(exampleLabel, themes.light.bg);
    expectReadable(helperCopy, themes.light.bg);
    expectReadable(toggleToDark, themes.light.bg);

    fireEvent.click(toggleToDark);

    const toggleToLight = screen.getByRole("button", { name: "Light" });

    expectReadable(screen.getByText("Try an example"), themes.dark.bg);
    expectReadable(
      screen.getByText(
        "Educational tool only — not legal advice. Always consult a qualified lawyer. Citations verified against CanLII where possible.",
      ),
      themes.dark.bg,
    );
    expectReadable(toggleToLight, themes.dark.bg);
  });
});
