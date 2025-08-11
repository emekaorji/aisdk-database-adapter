import OpenAI from 'openai';

import { MemoryStore } from './store';
import { Store, Chat, Message, ChatCompletion } from './types';

export class AIAdapter {
  private store: Store;
  private openai: OpenAI;
  private sessionId: string;

  public chat: Chat;
  public history: Message[] = [];

  constructor(
    openai: OpenAI,
    options: { store?: MemoryStore; sessionId: string }
  ) {
    this.openai = openai;
    this.sessionId = options.sessionId;
    this.store = options.store ?? new MemoryStore();
    this.chat = {
      ...this.openai.chat,
      completions: {
        create: this.create.bind(this),
      },
    };
  }

  async create(
    body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
    options?: OpenAI.RequestOptions
  ): Promise<ChatCompletion> {
    const history = await this.store.getSessionHistory(this.sessionId);
    const modifiedBody = {
      ...body,
      messages: [...history, ...body.messages],
    };
    const response = await this.openai.chat.completions.create(
      modifiedBody,
      options
    );
    const events = this.constructEvents(response, body);

    await this.store.saveEvents(events);

    const modifiedResponse = {
      ...response,
      history: [...history, ...events],
      sessionId: this.sessionId,
    };

    return modifiedResponse;
  }

  private constructEvents(
    response: OpenAI.Chat.Completions.ChatCompletion,
    body: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming
  ): Message[] {
    return [
      {
        sessionId: this.sessionId,
        model: response.model,
        userId: 'dummyUserId',
        role: 'assistant',
        content: response.choices[0].message.content ?? '',
        createdAt: response.created,
        updatedAt: response.created,
      },
    ];
  }
}
