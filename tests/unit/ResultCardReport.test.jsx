// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import ResultCard from "../../src/components/ResultCard.jsx";
import { ThemeProvider } from "../../src/lib/ThemeContext.jsx";

function renderCard(props = {}) {
  const defaults = {
    item: {
      citation: "R v Example, 2024 SCC 1",
      title: "R v Example",
      summary: "Example summary.",
      court: "SCC",
      year: "2024",
    },
    type: "case_law",
    verification: null,
    onCardClick: vi.fn(),
    onReportCaseLaw: vi.fn().mockResolvedValue({
      ok: true,
      reportId: "clr_1",
      reportedAt: "2026-04-15T12:00:00.000Z",
    }),
  };

  const finalProps = { ...defaults, ...props };
  render(
    <ThemeProvider>
      <ResultCard {...finalProps} />
    </ThemeProvider>,
  );

  return finalProps;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("ResultCard report flow", () => {
  it("opens the report panel without triggering the card click handler", () => {
    const props = renderCard();

    fireEvent.click(screen.getByTestId("report-case-law-open"));

    expect(screen.getByTestId("report-case-law-panel")).toBeTruthy();
    expect(props.onCardClick).not.toHaveBeenCalled();

    fireEvent.change(screen.getByTestId("report-case-law-reason"), {
      target: { value: "wrong_legal_issue" },
    });

    expect(props.onCardClick).not.toHaveBeenCalled();
  });

  it("covers opening, submitting, and success acknowledgement states", async () => {
    let resolveReport;
    const onReportCaseLaw = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveReport = resolve;
        }),
    );

    renderCard({ onReportCaseLaw });

    fireEvent.click(screen.getByTestId("report-case-law-open"));
    fireEvent.change(screen.getByTestId("report-case-law-reason"), {
      target: { value: "wrong_legal_issue" },
    });
    fireEvent.change(screen.getByTestId("report-case-law-note"), {
      target: { value: "Needs a tighter fit." },
    });
    fireEvent.click(screen.getByTestId("report-case-law-submit"));

    const submitButton = screen.getByTestId("report-case-law-submit");
    expect(submitButton.disabled).toBe(true);
    expect(submitButton.textContent).toBe("Sending...");
    expect(onReportCaseLaw).toHaveBeenCalledWith({
      item: expect.objectContaining({
        citation: "R v Example, 2024 SCC 1",
      }),
      resultIndex: 0,
      reason: "wrong_legal_issue",
      note: "Needs a tighter fit.",
    });

    resolveReport({
      ok: true,
      reportId: "clr_1",
      reportedAt: "2026-04-15T12:00:00.000Z",
    });

    await waitFor(() => {
      expect(screen.getByTestId("report-case-law-success")).toBeTruthy();
    });
  });

  it("shows an inline error and stays retryable when submission fails", async () => {
    renderCard({
      onReportCaseLaw: vi
        .fn()
        .mockRejectedValue(new Error("Could not save the report.")),
    });

    fireEvent.click(screen.getByTestId("report-case-law-open"));
    fireEvent.change(screen.getByTestId("report-case-law-reason"), {
      target: { value: "wrong_legal_issue" },
    });
    fireEvent.click(screen.getByTestId("report-case-law-submit"));

    await waitFor(() => {
      expect(screen.getByTestId("report-case-law-error").textContent).toContain(
        "Could not save the report.",
      );
    });
    expect(screen.queryByTestId("report-case-law-success")).toBeNull();
    expect(screen.getByTestId("report-case-law-submit").disabled).toBe(false);
  });
});
