import type { ChatMessage } from "@tsmono/inspect-common/types";
import {
  messageSearchText,
  resolveMessages,
} from "@tsmono/inspect-components/chat";
import {
  EventNode,
  eventSearchText,
} from "@tsmono/inspect-components/transcript";

import type { Events } from "../../../@types/extraInspect";

/**
 * Attack framing a task writes to `sample.metadata.attack`, so a reviewer sees
 * what the agent was asked to do and what the adversary wanted before reading
 * any of the trajectory.
 */
export interface AttackMetadata {
  task?: string;
  goal?: string;
  enteredVia?: string;
  payload?: string;
  label: string;
}

export type AttackLocationStatus =
  | "located"
  | "no-payload"
  | "payload-too-short"
  | "not-found";

export interface AttackLocation {
  status: AttackLocationStatus;
  eventId?: string;
  messageId?: string;
}

const kDefaultLabel = "Injection";

// A short probe matches incidental prose ("urgent", "password") and would badge
// an arbitrary row, which misleads a reviewer worse than no badge at all.
const kMinPayloadLength = 24;

const readString = (
  source: Record<string, unknown>,
  key: string
): string | undefined => {
  const value = source[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

/**
 * Reads `metadata.attack`, returning undefined when the sample carries no
 * attack framing at all so callers can treat absence as a single condition.
 */
export const parseAttackMetadata = (
  metadata: unknown
): AttackMetadata | undefined => {
  if (metadata === null || typeof metadata !== "object") return undefined;
  const attack = (metadata as Record<string, unknown>)["attack"];
  if (attack === null || typeof attack !== "object") return undefined;

  const source = attack as Record<string, unknown>;
  const parsed: AttackMetadata = {
    task: readString(source, "task"),
    goal: readString(source, "goal"),
    enteredVia: readString(source, "entered_via"),
    payload: readString(source, "payload"),
    label: readString(source, "label") ?? kDefaultLabel,
  };

  const hasContent =
    parsed.task !== undefined ||
    parsed.goal !== undefined ||
    parsed.enteredVia !== undefined ||
    parsed.payload !== undefined;
  return hasContent ? parsed : undefined;
};

// Whatever surface carries the payload re-wraps it (HTML, a JSON tool response,
// a rendered email body), so the stored text rarely matches byte-for-byte.
const normalize = (value: string): string =>
  value.replace(/\s+/g, " ").trim().toLowerCase();

/**
 * Finds the first transcript event and first message carrying `payload`.
 *
 * `status` distinguishes the ways this legitimately finds nothing, so the UI can
 * say which one happened rather than silently offering a dead jump target.
 */
export const locateAttack = ({
  events,
  messages,
  payload,
}: {
  events?: Events | null;
  messages?: ChatMessage[] | null;
  payload?: string;
}): AttackLocation => {
  if (payload === undefined) return { status: "no-payload" };

  const probe = normalize(payload);
  if (probe.length < kMinPayloadLength) return { status: "payload-too-short" };

  let eventId: string | undefined;
  for (const event of events ?? []) {
    // treeifyEvents keys rows by uuid; an event without one has no addressable
    // row to deep-link to.
    const uuid = event.uuid;
    if (!uuid) continue;
    const node = new EventNode(uuid, event, 0);
    if (eventSearchText(node).some((text) => normalize(text).includes(probe))) {
      eventId = uuid;
      break;
    }
  }

  let messageId: string | undefined;
  for (const resolved of resolveMessages(messages ?? [])) {
    const id = resolved.message.id;
    if (!id) continue;
    if (messageSearchText(resolved).some((t) => normalize(t).includes(probe))) {
      messageId = id;
      break;
    }
  }

  if (eventId === undefined && messageId === undefined) {
    return { status: "not-found" };
  }
  return { status: "located", eventId, messageId };
};

/** Human-readable reason a payload could not be pinned to a row. */
export const attackLocationHint = (
  location: AttackLocation
): string | undefined => {
  switch (location.status) {
    case "payload-too-short":
      return `Injection payload is too short to locate reliably (needs ${kMinPayloadLength}+ characters).`;
    case "not-found":
      return "Injection payload was not found in this sample's events or messages.";
    default:
      return undefined;
  }
};
