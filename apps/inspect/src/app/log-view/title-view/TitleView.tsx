import clsx from "clsx";
import { FC } from "react";

import {
  EvalPlan,
  EvalResults,
  EvalSpec,
  EvalStats,
} from "@tsmono/inspect-common/types";

import { EvalLogStatus } from "../../../@types/extraInspect";
import { RunningMetric } from "../../../client/api/types";
import { useTotalSampleCount } from "../../../state/hooks";

import { CollapsedTitleBar } from "./CollapsedTitleBar";
import { AttackSummaryBand } from "../../samples/attack/AttackSummaryBand";
import { parseAttackMetadata } from "../../samples/attack/attackMetadata";

import { PrimaryBar } from "./PrimaryBar";
import { SecondaryBar } from "./SecondaryBar";
import styles from "./TitleView.module.css";

interface TitleViewProps {
  evalSpec?: EvalSpec;
  evalResults?: EvalResults | null;
  runningMetrics?: RunningMetric[];
  evalPlan?: EvalPlan;
  evalStats?: EvalStats;
  status?: EvalLogStatus;
  tags?: string[];
  /** Eval metadata (edit-aware), read for the prompt-injection framing. */
  metadata?: Record<string, unknown> | null;
  collapsed?: boolean;
}

/**
 * Renders the Navbar
 */
export const TitleView: FC<TitleViewProps> = ({
  evalSpec,
  evalPlan,
  evalResults,
  evalStats,
  status,
  runningMetrics,
  tags,
  metadata,
  collapsed,
}) => {
  const totalSampleCount = useTotalSampleCount();
  // The task page is where a reviewer arrives from the task table, so it has to
  // restate what the columns said — otherwise the framing is only visible one
  // more click in, inside a single sample.
  const attack = parseAttackMetadata(metadata);

  return (
    <nav
      className={clsx(
        "navbar",
        "sticky-top",
        styles.navbarWrapper,
        collapsed ? styles.collapsed : styles.expanded
      )}
    >
      <div className={styles.expandedSlot} aria-hidden={collapsed}>
        <div className={styles.expandedInner}>
          <PrimaryBar
            evalSpec={evalSpec}
            evalResults={evalResults}
            status={status}
            runningMetrics={runningMetrics}
            sampleCount={totalSampleCount}
            tags={tags}
          />
          <SecondaryBar
            evalSpec={evalSpec}
            evalPlan={evalPlan}
            evalResults={evalResults}
            evalStats={evalStats}
            status={status}
            sampleCount={totalSampleCount}
          />
          {attack ? <AttackSummaryBand attack={attack} /> : null}
        </div>
      </div>
      <div className={styles.collapsedSlot} aria-hidden={!collapsed}>
        <CollapsedTitleBar
          evalSpec={evalSpec}
          evalResults={evalResults}
          runningMetrics={runningMetrics}
          status={status}
          sampleCount={totalSampleCount}
        />
        {attack ? <AttackSummaryBand attack={attack} compact /> : null}
      </div>
    </nav>
  );
};
