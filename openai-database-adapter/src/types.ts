import OpenAI, { APIPromise } from 'openai';

export interface Store {
  getSessionHistory(sessionId: string): Promise<Message[]>;
  saveEvents(events: Message[]): Promise<void>;
}

export interface ChatCompletion extends OpenAI.Chat.Completions.ChatCompletion {
  history: Message[];
  sessionId: string;
}

export interface Chat {
  completions: {
    create: (
      body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
      options?: OpenAI.RequestOptions
    ) => Promise<ChatCompletion>;
  };
}

export interface Message {
  sessionId: string;
  model: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
  updatedAt: number;
}
