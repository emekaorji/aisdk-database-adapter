import { Message, Store } from '../types';
import { createClient, RedisClientType } from 'redis';

export type RedisStoreOptions = {
  url?: string; // if provided, use real Redis
  client?: RedisClientType; // alternatively, inject an existing client
  namespace?: string; // key prefix namespace
  ttlSeconds?: number; // optional key expiration
};

export class RedisStore implements Store {
  private client: RedisClientType;
  private readonly prefix: string;
  private readonly ttlSeconds?: number;

  constructor(options: RedisStoreOptions = {}) {
    this.prefix = `chat:session:${options.namespace ?? 'default'}`;
    this.ttlSeconds = options.ttlSeconds;

    if (options.client) {
      this.client = options.client;
    } else if (options.url) {
      this.client = createClient({ url: options.url });
    } else {
      throw new Error('RedisStore requires either a url or a client');
    }

    // Ensure connection; node-redis queues commands before connect, but we connect proactively
    if (!this.client.isOpen) {
      // Fire and forget; consumers can also manage lifecycle externally via `client` option
      this.client.connect().catch(() => {});
    }
  }

  private key(sessionId: string): string {
    return `${this.prefix}:${sessionId}`;
  }

  async getSessionHistory(sessionId: string): Promise<Message[]> {
    const key = this.key(sessionId);
    const raw = await this.client.lRange(key, 0, -1);
    const messages = raw.map((s: string) => JSON.parse(s) as Message);
    return messages.sort((a: Message, b: Message) => a.createdAt - b.createdAt);
  }

  async saveEvents(events: Message[]): Promise<void> {
    if (!events?.length) return;

    const bySession = new Map<string, string[]>();
    for (const e of events) {
      if (!e.sessionId) continue;
      const list = bySession.get(e.sessionId) ?? [];
      list.push(JSON.stringify(e));
      bySession.set(e.sessionId, list);
    }

    for (const [sessionId, payloads] of bySession) {
      const key = this.key(sessionId);
      if (payloads.length) {
        await this.client.rPush(key, ...payloads);
      }
      if (this.ttlSeconds && this.ttlSeconds > 0) {
        await this.client.expire(key, this.ttlSeconds);
      }
    }
  }
}
