import { useMemo } from "react";

import type { ChatMessage } from "@tsmono/inspect-common/types";
import type { SearchReferenceLabels } from "@tsmono/inspect-components/transcript-search";

import type { Events } from "../../../@types/extraInspect";

import {
  locateAttack,
  parseAttackMetadata,
  type AttackLocation,
  type AttackMetadata,
} from "./attackMetadata";

export interface AttackAnnotation {
  attack?: AttackMetadata;
  location: AttackLocation;
  /** Badge for the located row, in the shape the transcript and chat merge. */
  labels?: SearchReferenceLabels;
}

/**
 * Resolves a sample's attack framing into a badge and a jump target.
 *
 * The scan is O(events + messages) per identity change of either list. That is
 * once for a completed sample, but once per poll for a running one whose payload
 * is never found — acceptable because a sample with no `metadata.attack` skips
 * the scan entirely, and an attack sample's payload matches an early event.
 */
export const useAttackAnnotation = ({
  metadata,
  events,
  messages,
}: {
  metadata?: unknown;
  events?: Events | null;
  messages?: ChatMessage[] | null;
}): AttackAnnotation => {
  const attack = useMemo(() => parseAttackMetadata(metadata), [metadata]);
  const payload = attack?.payload;

  const location = useMemo(
    () => locateAttack({ events, messages, payload }),
    [events, messages, payload]
  );

  const labels = useMemo((): SearchReferenceLabels | undefined => {
    if (!attack || location.status !== "located") return undefined;
    return {
      ...(location.eventId
        ? { eventLabels: { [location.eventId]: attack.label } }
        : {}),
      ...(location.messageId
        ? { messageLabels: { [location.messageId]: attack.label } }
        : {}),
    };
  }, [attack, location]);

  return { attack, location, labels };
};
