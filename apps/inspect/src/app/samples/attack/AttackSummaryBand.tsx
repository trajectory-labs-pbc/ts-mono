import clsx from "clsx";
import { FC, Fragment } from "react";

import styles from "./AttackSummaryBand.module.css";
import type { AttackMetadata } from "./attackMetadata";

interface AttackSummaryBandProps {
  attack: AttackMetadata;
  /**
   * Collapsed chrome: goal only, on one line. Landing from a jump collapses the
   * header, and that is the moment the reviewer most needs the goal — dropping
   * the whole band there would mean the jump discards its own context.
   */
  compact?: boolean;
}

/**
 * The task/adversarial-goal framing, above the transcript. A reviewer needs to
 * know what was asked and what the adversary wanted before the trajectory means
 * anything; `Input` alone is the raw prompt, not the framing.
 */
export const AttackSummaryBand: FC<AttackSummaryBandProps> = ({
  attack,
  compact = false,
}) => {
  const rows: { key: string; label: string; value: string; goal?: boolean }[] =
    [];
  if (attack.task && !compact) {
    rows.push({ key: "task", label: "Task", value: attack.task });
  }
  if (attack.goal) {
    rows.push({
      key: "goal",
      label: "Attack goal",
      value: attack.goal,
      goal: true,
    });
  }
  if (attack.enteredVia && !compact) {
    rows.push({
      key: "entered-via",
      label: "Entered via",
      value: attack.enteredVia,
    });
  }
  if (rows.length === 0) return null;

  return (
    <div className={clsx(styles.band, compact && styles.compact)}>
      {rows.map((row) => (
        <Fragment key={row.key}>
          <div className={styles.label} data-unsearchable={true}>
            {row.label}
          </div>
          <div
            className={clsx(
              styles.value,
              row.goal && styles.goal,
              compact && styles.oneLine
            )}
          >
            {row.value}
          </div>
        </Fragment>
      ))}
    </div>
  );
};
