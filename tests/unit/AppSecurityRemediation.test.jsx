// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import App from "../../src/App.jsx";

describe("App security remediation", () => {
  it("renders without AdSense containers or ad client identifiers", () => {
    const { container } = render(<App />);

    expect(container.querySelectorAll(".adsbygoogle")).toHaveLength(0);
    expect(container.querySelectorAll("[data-ad-client]")).toHaveLength(0);
  });
});
