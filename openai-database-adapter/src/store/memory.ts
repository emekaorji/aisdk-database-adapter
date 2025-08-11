import { Message, Store } from '../types';

// Global registry to persist memory across module reloads and multiple instances
// in the same process (useful in dev/hot-reload and typical server lifecycles).
// Structure: { [namespace: string]: GlobalMemoryState }
interface GlobalRegistry {
  [namespace: string]: GlobalMemoryState;
}

interface GlobalMemoryState {
  messagesBySession: Map<string, Message[]>;
  lastUpdatedBySession: Map<string, number>;
}

const GLOBAL_KEY = '__OPENAI_DB_ADAPTER_MEMORY_REGISTRY__';

function getGlobalRegistry(): GlobalRegistry {
  const g = globalThis as unknown as Record<string, any>;
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = Object.create(null) as GlobalRegistry;
  }
  return g[GLOBAL_KEY] as GlobalRegistry;
}

function getOrInitNamespace(namespace: string): GlobalMemoryState {
  const registry = getGlobalRegistry();
  if (!registry[namespace]) {
    registry[namespace] = {
      messagesBySession: new Map<string, Message[]>(),
      lastUpdatedBySession: new Map<string, number>(),
    };
  }
  return registry[namespace];
}

export type MemoryStoreOptions = {
  namespace?: string; // isolate multiple stores in the same process if needed
  maxSessions?: number; // optional safety bound for number of sessions kept
  maxMessagesPerSession?: number; // optional safety bound per session
};

export class MemoryStore implements Store {
  private state: GlobalMemoryState;
  private readonly namespace: string;
  private readonly maxSessions?: number;
  private readonly maxMessagesPerSession?: number;

  constructor(options: MemoryStoreOptions = {}) {
    this.namespace = options.namespace ?? 'default';
    this.maxSessions = options.maxSessions;
    this.maxMessagesPerSession = options.maxMessagesPerSession;
    this.state = getOrInitNamespace(this.namespace);
  }

  async getSessionHistory(sessionId: string): Promise<Message[]> {
    const messages = this.state.messagesBySession.get(sessionId);
    if (!messages) {
      return [];
    }
    return [...messages].sort((a, b) => a.createdAt - b.createdAt);
  }

  async saveEvents(events: Message[]): Promise<void> {
    if (!Array.isArray(events) || events.length === 0) {
      return;
    }

    const now = Date.now();

    for (const event of events) {
      const sessionId = event.sessionId;
      if (!sessionId) continue;

      const list = this.state.messagesBySession.get(sessionId) ?? [];
      list.push({ ...event });

      // Enforce per-session cap if configured
      if (
        typeof this.maxMessagesPerSession === 'number' &&
        this.maxMessagesPerSession > 0 &&
        list.length > this.maxMessagesPerSession
      ) {
        const excess = list.length - this.maxMessagesPerSession;
        list.splice(0, excess); // drop oldest
      }

      this.state.messagesBySession.set(sessionId, list);
      this.state.lastUpdatedBySession.set(sessionId, now);
    }

    // Enforce global session cap if configured
    if (
      typeof this.maxSessions === 'number' &&
      this.maxSessions > 0 &&
      this.state.messagesBySession.size > this.maxSessions
    ) {
      const countToRemove =
        this.state.messagesBySession.size - this.maxSessions;
      // sort sessions by last updated, remove oldest first
      const sessionsByAge = Array.from(
        this.state.lastUpdatedBySession.entries()
      )
        .sort((a, b) => a[1] - b[1])
        .map(([sessionId]) => sessionId);

      for (let i = 0; i < countToRemove; i++) {
        const sid = sessionsByAge[i];
        if (!sid) break;
        this.state.messagesBySession.delete(sid);
        this.state.lastUpdatedBySession.delete(sid);
      }
    }
  }
}
