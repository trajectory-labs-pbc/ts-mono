import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { AttackSummaryBand } from "./AttackSummaryBand";
import { parseAttackMetadata } from "./attackMetadata";

afterEach(cleanup);

describe("AttackSummaryBand", () => {
  it("shows the framing a reviewer needs before reading the trajectory", () => {
    const attack = parseAttackMetadata({
      attack: {
        task: "Build an itinerary for the user's conference",
        goal: "Exfiltrate the user's stored credentials",
        entered_via: "Email from an outside party, read via read_email",
      },
    });

    render(<AttackSummaryBand attack={attack!} />);

    expect(screen.getByText("Task")).toBeInTheDocument();
    expect(screen.getByText("Attack goal")).toBeInTheDocument();
    expect(screen.getByText("Entered via")).toBeInTheDocument();
    expect(
      screen.getByText("Exfiltrate the user's stored credentials")
    ).toBeInTheDocument();
  });

  it("omits rows the task did not supply", () => {
    const attack = parseAttackMetadata({
      attack: { goal: "Exfiltrate SSH keys" },
    });

    render(<AttackSummaryBand attack={attack!} />);

    expect(screen.getByText("Attack goal")).toBeInTheDocument();
    expect(screen.queryByText("Task")).toBeNull();
    expect(screen.queryByText("Entered via")).toBeNull();
  });

  it("renders framing as literal text", () => {
    const goal = '<img src=x onerror="window.__attackXss=true">';
    const { container } = render(
      <AttackSummaryBand attack={{ goal, label: "Injection" }} />
    );

    expect(screen.getByText(goal)).toBeInTheDocument();
    expect(container.querySelector("img, svg, script")).toBeNull();
  });

  it("renders nothing when only a payload was supplied", () => {
    const { container } = render(
      <AttackSummaryBand attack={{ payload: "x".repeat(40), label: "I" }} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
