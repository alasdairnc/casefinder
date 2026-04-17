// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { useSearchHistory } from "../../src/hooks/useSearchHistory.js";

function Harness() {
  const { history, addToHistory, clearHistory, rerunQuery } = useSearchHistory();

  return (
    <div>
      <div data-testid="history-count">{history.length}</div>
      <div data-testid="rerun-result">
        {JSON.stringify(rerunQuery(history[0]?.id) || null)}
      </div>
      <button
        onClick={() =>
          addToHistory(
            "trial delay",
            { jurisdiction: "Ontario", lawTypes: { case_law: true } },
            { case_law: [{ citation: "R v Jordan, 2016 SCC 27" }] },
          )
        }
      >
        add
      </button>
      <button onClick={clearHistory}>clear</button>
    </div>
  );
}

describe("useSearchHistory", () => {
  it("stores history only in memory and clears on remount", () => {
    const localStorageStub = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("localStorage", localStorageStub);
    window.localStorage = localStorageStub;

    const firstRender = render(<Harness />);

    expect(screen.getByTestId("history-count").textContent).toBe("0");
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByTestId("history-count").textContent).toBe("1");
    expect(screen.getByTestId("rerun-result").textContent).toContain(
      '"query":"trial delay"',
    );

    firstRender.unmount();

    render(<Harness />);
    expect(screen.getByTestId("history-count").textContent).toBe("0");

    expect(localStorageStub.getItem).not.toHaveBeenCalled();
    expect(localStorageStub.setItem).not.toHaveBeenCalled();
    expect(localStorageStub.removeItem).not.toHaveBeenCalled();
  });
});
