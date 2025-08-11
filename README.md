A minimal AI SDK Database Adapter with TypeScript

Usage:

```ts
import OpenAI from 'openai';
import { AIAdapter, MemoryStore } from 'openai-database-adapter';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const openaiWithDb = new AIAdapter(openai, {
  store: new MemoryStore(),
  sessionId: '123e4567-e89b-12d3-a456-426614174000',
});

const response = await openaiWithDb.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'What is the capital of Germany?' }],
});

console.log(`[AI] Response: ${response.choices[0].message.content}`);
console.log(
  `Found ${response.history.length} events for session '${response.sessionId}':`
);
console.log(JSON.stringify(response.history, null, 2));
```

## Features

- [x] Store chat history in a memory
- [x] Store chat history in a file
- [ ] Store chat history in a redis
- [ ] Store chat history in a postgres (drizzle)
- [ ] Store chat history in a sqlite (drizzle)
- [ ] Store chat history in a browser indexeddb
- [ ] Store chat history in a browser localstorage/sessionstorage

## TODO

- [ ] Add tests
- [ ] Add documentation
- [ ] Add examples
- [ ] Add more stores
- [ ] Add more features
- [ ] Add more tests
