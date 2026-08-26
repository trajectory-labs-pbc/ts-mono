import { describe, expect, it } from "vitest";

import type { Log } from "../client/api/types";

import { computeSupersededByTask, type LogListingRow } from "./logListing";

const run = (opts: {
  name: string;
  task?: string;
  completed_at?: string;
}): LogListingRow =>
  ({
    name: opts.name,
    task: opts.task,
    completed_at: opts.completed_at,
    depth: "previewed",
    preview_attempts: 0,
    details_attempts: 0,
    details_settled_seq: 0,
  }) as unknown as Log;

const surviving = (rows: LogListingRow[]) =>
  rows.filter((r) => r.supersededByTask !== true).map((r) => r.name);

describe("computeSupersededByTask", () => {
  it("keeps one row per task — the newest run", () => {
    const rows = computeSupersededByTask([
      run({ name: "a-run1.eval", task: "alpha", completed_at: "2026-08-21" }),
      run({ name: "a-run2.eval", task: "alpha", completed_at: "2026-08-24" }),
      run({ name: "a-run3.eval", task: "alpha", completed_at: "2026-08-22" }),
      run({ name: "b-run1.eval", task: "beta", completed_at: "2026-08-23" }),
    ]);

    expect(surviving(rows)).toEqual(["a-run2.eval", "b-run1.eval"]);
  });

  it("stamps the run count on the surviving row only", () => {
    const rows = computeSupersededByTask([
      run({ name: "a-run1.eval", task: "alpha", completed_at: "2026-08-21" }),
      run({ name: "a-run2.eval", task: "alpha", completed_at: "2026-08-24" }),
      run({ name: "b-run1.eval", task: "beta", completed_at: "2026-08-23" }),
    ]);

    const byName = Object.fromEntries(rows.map((r) => [r.name, r]));
    expect(byName["a-run2.eval"]?.taskRunCount).toBe(2);
    expect(byName["b-run1.eval"]?.taskRunCount).toBe(1);
    expect(byName["a-run1.eval"]?.taskRunCount).toBeUndefined();
  });

  it("does not collapse different tasks that share a completion time", () => {
    const rows = computeSupersededByTask([
      run({ name: "a.eval", task: "alpha", completed_at: "2026-08-24" }),
      run({ name: "b.eval", task: "beta", completed_at: "2026-08-24" }),
    ]);

    expect(surviving(rows)).toEqual(["a.eval", "b.eval"]);
  });

  it("breaks a completion-time tie by filename descending", () => {
    const rows = computeSupersededByTask([
      run({ name: "a-run1.eval", task: "alpha", completed_at: "2026-08-24" }),
      run({ name: "a-run2.eval", task: "alpha", completed_at: "2026-08-24" }),
    ]);

    expect(surviving(rows)).toEqual(["a-run2.eval"]);
  });

  it("prefers a completed run over one with no completion time", () => {
    const rows = computeSupersededByTask([
      run({ name: "a-run1.eval", task: "alpha", completed_at: "2026-08-24" }),
      run({ name: "a-run2.eval", task: "alpha" }),
    ]);

    expect(surviving(rows)).toEqual(["a-run1.eval"]);
  });

  it("never supersedes a row with no task name", () => {
    const rows = computeSupersededByTask([
      run({ name: "x.eval" }),
      run({ name: "y.eval" }),
    ]);

    expect(surviving(rows)).toEqual(["x.eval", "y.eval"]);
    expect(rows.every((r) => r.supersededByTask === undefined)).toBe(true);
  });

  it("leaves the input order intact", () => {
    const rows = computeSupersededByTask([
      run({ name: "b.eval", task: "beta", completed_at: "2026-08-23" }),
      run({ name: "a.eval", task: "alpha", completed_at: "2026-08-24" }),
    ]);

    expect(rows.map((r) => r.name)).toEqual(["b.eval", "a.eval"]);
  });
});
