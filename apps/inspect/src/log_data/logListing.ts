import { useDeferredValue } from "react";

import { useMapAsyncData } from "@tsmono/react/hooks";
import { AsyncData } from "@tsmono/util";

import { EvalLogStatus } from "../@types/extraInspect";
import { Log } from "../client/api/types";

import { useLogs } from "./logsContent";

/**
 * The listing read: one row per log file in the directory — the Log entity
 * row with retried runs marked. Content fills in as depth increases; that
 * the tiers are fetched separately is not observable here beyond attribute
 * columns being briefly undefined. Lives here (not in state/) so the
 * paged-listing migration can swap its internals (whole-dir read → paged
 * Dexie query) without touching consumers.
 */

const isActiveStatus = (status: EvalLogStatus | undefined) =>
  status === "started" || status === "success";

export type LogListingRow = Log & {
  retried?: boolean;
  /**
   * A run of a task that has a newer run. Distinct from `retried`, which keys
   * on `task_id` and means "the same run, attempted again": independent runs of
   * one task each get their own `task_id`, so retried-dedup never collapses
   * them. Tasks view hides these to get one row per task.
   */
  supersededByTask?: boolean;
  /** Total runs of this row's task in the listing. Only set on the newest. */
  taskRunCount?: number;
};

/**
 * Pure dedup logic for {@link useLogListing}.
 *
 * Groups logs by (parent directory, task_id) so that logs sharing a task_id
 * across different folders (e.g. copied log directories under a shared parent)
 * are not treated as retries of each other. Within each group, logs whose
 * status is `started` or `success` rank above other statuses; ties are
 * broken by filename descending so the newest run wins. The winner is
 * marked `retried: false`; the rest are marked `retried: true`.
 */
export const computeLogsWithRetried = (logs: Log[]): LogListingRow[] => {
  const logsByGroup = logs.reduce((acc: Record<string, Log[]>, log) => {
    const taskId = log.task_id;
    if (taskId) {
      const slash = log.name.lastIndexOf("/");
      const parent = slash >= 0 ? log.name.substring(0, slash) : "";
      const key = `${parent}|${taskId}`;
      (acc[key] ??= []).push(log);
    }
    return acc;
  }, {});
  // For each group, select the best item: prefer logs whose status is
  // started or success (treated as equivalent — both mean "not failed"),
  // then break ties by filename descending so the newest run wins.
  // An older `started` log is treated as orphaned once a newer log exists.
  const bestByName: Record<string, LogListingRow> = {};
  for (const items of Object.values(logsByGroup)) {
    const best = [...items].sort((a, b) => {
      const aActive = isActiveStatus(a.status);
      const bActive = isActiveStatus(b.status);
      if (aActive !== bActive) return aActive ? -1 : 1;
      return b.name.localeCompare(a.name);
    })[0];
    if (best !== undefined) {
      bestByName[best.name] = { ...best, retried: false };
    }
  }

  // Rebuild logs maintaining order, marking duplicates as skippable
  return logs.map(
    (log) =>
      bestByName[log.name] ?? {
        ...log,
        // task_id is optional for backward compatibility, only new logs files can be skippable
        retried: log.task_id ? true : undefined,
      }
  );
};

/**
 * Marks every run of a task except its newest as {@link
 * LogListingRow.supersededByTask}, and stamps the newest with the task's total
 * run count. Grouped by task NAME, not `task_id`: independent runs of one task
 * each carry their own `task_id`, which is exactly the case retried-dedup
 * cannot see.
 *
 * Newest is by `completed_at`, falling back to filename descending when a run
 * has no completion time (still running, or a pre-`completed_at` log).
 */
export const computeSupersededByTask = (
  logs: LogListingRow[]
): LogListingRow[] => {
  const byTask = logs.reduce((acc: Record<string, LogListingRow[]>, log) => {
    if (log.task) (acc[log.task] ??= []).push(log);
    return acc;
  }, {});

  const newestByName: Record<string, number> = {};
  for (const runs of Object.values(byTask)) {
    const newest = [...runs].sort((a, b) => {
      const at = a.completed_at ?? "";
      const bt = b.completed_at ?? "";
      if (at !== bt) return bt.localeCompare(at);
      return b.name.localeCompare(a.name);
    })[0];
    if (newest !== undefined) newestByName[newest.name] = runs.length;
  }

  return logs.map((log) => {
    const runCount = newestByName[log.name];
    if (runCount !== undefined) {
      return { ...log, supersededByTask: false, taskRunCount: runCount };
    }
    // No task name means nothing to group on, so it can never be superseded.
    return { ...log, supersededByTask: log.task ? true : undefined };
  });
};

export const useLogListing = (logDir: string): AsyncData<LogListingRow[]> => {
  const logs = useLogs(logDir);
  // Deferred so the burst of row flushes during initial sync can't block
  // click/scroll input — the listing renders from the prior rows and
  // catches up when the main thread is idle.
  const deferredLogs = useDeferredValue(logs);

  return useMapAsyncData(deferredLogs, computeListingRows);
};

/** Both grouping passes, in order: retried-dedup then task supersession. */
export const computeListingRows = (logs: Log[]): LogListingRow[] =>
  computeSupersededByTask(computeLogsWithRetried(logs));
