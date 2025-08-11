import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { dirname } from 'node:path';
import { constants as fsConstants } from 'node:fs';

import { Message, Store } from '../types';

export class FileStore implements Store {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private async ensureFileReady(): Promise<void> {
    try {
      await access(this.filePath, fsConstants.F_OK);
    } catch {
      // Create directory and empty JSON file if missing
      await mkdir(dirname(this.filePath), { recursive: true });
      await writeFile(
        this.filePath,
        JSON.stringify({ sessions: {} }, null, 2),
        'utf8'
      );
    }
  }

  private async readAll(): Promise<Record<string, Message[]>> {
    await this.ensureFileReady();
    const raw = await readFile(this.filePath, 'utf8');
    try {
      const parsed = JSON.parse(raw) as {
        sessions?: Record<string, Message[]>;
      };
      return parsed.sessions ?? {};
    } catch {
      // Reset on corruption
      return {};
    }
  }

  private async writeAll(sessions: Record<string, Message[]>): Promise<void> {
    await writeFile(
      this.filePath,
      JSON.stringify({ sessions }, null, 2),
      'utf8'
    );
  }

  async getSessionHistory(sessionId: string): Promise<Message[]> {
    const sessions = await this.readAll();
    const messages = sessions[sessionId] ?? [];
    return [...messages].sort((a, b) => a.createdAt - b.createdAt);
  }

  async saveEvents(events: Message[]): Promise<void> {
    if (!Array.isArray(events) || events.length === 0) {
      return;
    }
    const sessions = await this.readAll();
    for (const event of events) {
      const sessionId = event.sessionId;
      if (!sessionId) continue;
      const list = sessions[sessionId] ?? [];
      list.push({ ...event });
      sessions[sessionId] = list;
    }
    await this.writeAll(sessions);
  }
}
