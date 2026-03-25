// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { ThemeProvider, useTheme, useThemeActions } from "../../src/lib/ThemeContext.jsx";
import { themes } from "../../src/lib/themes.js";

const wrapper = ({ children }) => <ThemeProvider>{children}</ThemeProvider>;

describe("ThemeContext", () => {
  it("useTheme returns the light theme by default", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current).toEqual(themes.light);
  });

  it("useThemeActions.isDark is false by default", () => {
    const { result } = renderHook(() => useThemeActions(), { wrapper });
    expect(result.current.isDark).toBe(false);
  });

  it("toggleTheme switches to dark theme", () => {
    const { result } = renderHook(
      () => ({ theme: useTheme(), actions: useThemeActions() }),
      { wrapper }
    );

    act(() => {
      result.current.actions.toggleTheme();
    });

    expect(result.current.actions.isDark).toBe(true);
    expect(result.current.theme).toEqual(themes.dark);
  });

  it("toggleTheme switches back to light theme on second call", () => {
    const { result } = renderHook(
      () => ({ theme: useTheme(), actions: useThemeActions() }),
      { wrapper }
    );

    act(() => result.current.actions.toggleTheme());
    act(() => result.current.actions.toggleTheme());

    expect(result.current.actions.isDark).toBe(false);
    expect(result.current.theme).toEqual(themes.light);
  });

  it("useTheme throws when called outside ThemeProvider", () => {
    expect(() => renderHook(() => useTheme())).toThrow(
      "useTheme must be used within ThemeProvider"
    );
  });

  it("useThemeActions throws when called outside ThemeProvider", () => {
    expect(() => renderHook(() => useThemeActions())).toThrow(
      "useThemeActions must be used within ThemeProvider"
    );
  });
});
