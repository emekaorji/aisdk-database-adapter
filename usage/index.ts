import OpenAI from 'openai';

async function main() {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Make sure to set your API key in the environment variables
  });

  console.log('Sending a message to the chat completions API...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a helpful assistant.',
      },
      {
        role: 'user',
        content:
          'What are the top 3 benefits of using a database adapter with OpenAI?',
      },
    ],
  });

  console.log("Assistant's response:");
  if (response.choices[0].message.content) {
    console.log(response.choices[0].message.content);
  } else {
    console.log('The assistant did not provide a response.');
  }
}

main().catch(console.error);
