import clsx from "clsx";
import { FC, Fragment } from "react";

import styles from "./AttackSummaryBand.module.css";
import type { AttackMetadata } from "./attackMetadata";

interface AttackSummaryBandProps {
  attack: AttackMetadata;
}

/**
 * The task/adversarial-goal framing, above the transcript. A reviewer needs to
 * know what was asked and what the adversary wanted before the trajectory means
 * anything; `Input` alone is the raw prompt, not the framing.
 */
export const AttackSummaryBand: FC<AttackSummaryBandProps> = ({ attack }) => {
  const rows: { key: string; label: string; value: string; goal?: boolean }[] =
    [];
  if (attack.task) {
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
  if (attack.enteredVia) {
    rows.push({
      key: "entered-via",
      label: "Entered via",
      value: attack.enteredVia,
    });
  }
  if (rows.length === 0) return null;

  return (
    <div className={styles.band}>
      {rows.map((row) => (
        <Fragment key={row.key}>
          <div className={styles.label} data-unsearchable={true}>
            {row.label}
          </div>
          <div className={clsx(styles.value, row.goal && styles.goal)}>
            {row.value}
          </div>
        </Fragment>
      ))}
    </div>
  );
};
