export const liveEscalationSnapshotsChangedEvent = "tractionflo:live-escalation-snapshots-changed";

const liveEscalationSnapshotsStorageKey = "tractionflo.liveEscalationSnapshots";
const maxSnapshotAgeMs = 14 * 24 * 60 * 60 * 1000;

type LiveEscalationMessage = {
  id: string;
  text: string;
  attachments?: {
    type: string;
    url: string;
    preview_url?: string;
    name?: string;
  }[];
  from: "me" | "user" | "note";
  sender_name?: string;
  sender_id?: string;
  time: string;
};

export type LiveEscalationConversation = {
  id: string;
  participant: {
    id: string;
    name?: string;
    username?: string;
    profile_pic?: string;
  };
  updated_time?: string;
  messages: LiveEscalationMessage[];
};

type LiveEscalationSnapshot = LiveEscalationConversation & {
  savedAt: string;
};

function getSnapshotTime(value?: string) {
  const parsed = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLatestMessageTime(conversation: LiveEscalationConversation) {
  return Math.max(
    getSnapshotTime(conversation.updated_time),
    ...conversation.messages.map((message) => getSnapshotTime(message.time))
  );
}

function isSnapshot(value: unknown): value is LiveEscalationSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Partial<LiveEscalationSnapshot>;
  return Boolean(record.id && record.participant && Array.isArray(record.messages) && record.savedAt);
}

function normalizeSnapshot(conversation: LiveEscalationConversation): LiveEscalationSnapshot | null {
  const id = conversation.id?.trim();

  if (!id) {
    return null;
  }

  return {
    id,
    participant: {
      id: conversation.participant?.id || id,
      name: conversation.participant?.name || conversation.participant?.username || `Instagram user ${id.slice(-6)}`,
      username: conversation.participant?.username,
      profile_pic: conversation.participant?.profile_pic,
    },
    updated_time: conversation.updated_time || new Date(getLatestMessageTime(conversation) || Date.now()).toISOString(),
    messages: conversation.messages
      .filter((message) => message.id && message.from && message.time)
      .map((message) => ({
        id: message.id,
        text: message.text || "",
        attachments: message.attachments?.map((attachment) => ({
          type: attachment.type,
          url: attachment.url || "",
          preview_url: attachment.preview_url,
          name: attachment.name,
        })),
        from: message.from,
        sender_name: message.sender_name,
        sender_id: message.sender_id,
        time: message.time,
      })),
    savedAt: new Date().toISOString(),
  };
}

function readRawSnapshots() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(liveEscalationSnapshotsStorageKey);
    const parsed = storedValue ? JSON.parse(storedValue) : [];
    const cutoff = Date.now() - maxSnapshotAgeMs;

    return Array.isArray(parsed)
      ? parsed
          .filter(isSnapshot)
          .filter((snapshot) => getSnapshotTime(snapshot.savedAt) >= cutoff)
      : [];
  } catch {
    return [];
  }
}

function writeSnapshots(snapshots: LiveEscalationSnapshot[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(liveEscalationSnapshotsStorageKey, JSON.stringify(snapshots.slice(0, 25)));
  window.dispatchEvent(new CustomEvent(liveEscalationSnapshotsChangedEvent));
}

function mergeMessages(
  first: LiveEscalationConversation,
  second: LiveEscalationConversation
): LiveEscalationMessage[] {
  const byId = new Map<string, LiveEscalationMessage>();

  for (const message of [...first.messages, ...second.messages]) {
    byId.set(message.id, message);
  }

  return Array.from(byId.values()).sort((a, b) => getSnapshotTime(b.time) - getSnapshotTime(a.time));
}

export function upsertLiveEscalationSnapshot(conversation: LiveEscalationConversation) {
  const snapshot = normalizeSnapshot(conversation);

  if (!snapshot || snapshot.messages.length === 0 || typeof window === "undefined") {
    return;
  }

  const snapshots = readRawSnapshots().filter((item) => item.id !== snapshot.id);
  writeSnapshots([snapshot, ...snapshots].sort((a, b) => getLatestMessageTime(b) - getLatestMessageTime(a)));
}

export function readLiveEscalationSnapshots(): LiveEscalationConversation[] {
  return readRawSnapshots().map((snapshot) => ({
    id: snapshot.id,
    participant: snapshot.participant,
    updated_time: snapshot.updated_time,
    messages: snapshot.messages,
  }));
}

export function mergeLiveEscalationSnapshots<T extends LiveEscalationConversation>(conversations: T[]) {
  const byId = new Map<string, LiveEscalationConversation>();

  for (const conversation of conversations) {
    byId.set(conversation.id, conversation);
  }

  const rawSnapshots = readRawSnapshots();
  const validSnapshots: LiveEscalationSnapshot[] = [];
  const now = Date.now();

  for (const snapshot of rawSnapshots) {
    const existing = byId.get(snapshot.id);
    const snapshotAge = now - getSnapshotTime(snapshot.savedAt);

    if (!existing) {
      if (snapshotAge <= 120_000) {
        validSnapshots.push(snapshot);
        byId.set(snapshot.id, {
          id: snapshot.id,
          participant: snapshot.participant,
          updated_time: snapshot.updated_time,
          messages: snapshot.messages,
        });
      }
      continue;
    }

    const dbMessageIds = new Set(existing.messages.map((m) => m.id));
    const mergedMessages = mergeMessages(existing, snapshot).filter((message) => {
      if (dbMessageIds.has(message.id)) {
        return true;
      }
      const messageAge = now - getSnapshotTime(message.time);
      return messageAge <= 120_000;
    });

    validSnapshots.push({
      ...snapshot,
      messages: mergedMessages,
    });

    byId.set(snapshot.id, {
      ...existing,
      participant: {
        id: existing.participant.id || snapshot.participant.id,
        name: existing.participant.name || snapshot.participant.name,
        username: existing.participant.username || snapshot.participant.username,
        profile_pic: existing.participant.profile_pic || snapshot.participant.profile_pic,
      },
      updated_time:
        getSnapshotTime(existing.updated_time) >= getSnapshotTime(snapshot.updated_time)
          ? existing.updated_time
          : snapshot.updated_time,
      messages: mergedMessages,
    });
  }

  if (typeof window !== "undefined" && rawSnapshots.length !== validSnapshots.length) {
    window.localStorage.setItem(liveEscalationSnapshotsStorageKey, JSON.stringify(validSnapshots.slice(0, 25)));
  }

  return Array.from(byId.values()).sort((a, b) => getLatestMessageTime(b) - getLatestMessageTime(a));
}
