import OpenAI from 'openai';
import { AIAdapter, MemoryStore } from 'openai-database-adapter';

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const response0 = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'What is the capital of Germany?' }],
  });
  console.log(`[AI] Response: ${response0.choices[0].message.content}`);

  const openaiWithDb = new AIAdapter(openai, {
    store: new MemoryStore(),
    sessionId: '123e4567-e89b-12d3-a456-426614174000',
  });

  const response = await openaiWithDb.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'What is the capital of Germany?' }],
  });

  console.log(`[AI] Response: ${response.choices[0].message.content}`);

  console.log('\nVerifying data was automatically saved to the store...');
  const history = response.history;

  console.log(
    `Found ${history.length} events for session '${response.sessionId}':`
  );
  console.log(JSON.stringify(history, null, 2));

  console.log('\n--- Demo Complete ---');
}

main().catch((error) => {
  if (error.code === 'missing_api_key') {
    console.error('--- Demo Failed ---');
    console.error(
      'Please set your OPENAI_API_KEY environment variable to run this example.'
    );
  } else {
    console.error(error);
  }
});
