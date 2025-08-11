import { Message, Store } from '../types';

export class PostgresStore implements Store {
  getSessionHistory(sessionId: string): Promise<Message[]> {
    return Promise.resolve([]);
  }
  saveEvents(events: Message[]): Promise<void> {
    return Promise.resolve();
  }
}
