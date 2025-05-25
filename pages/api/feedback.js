import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages } = req.body;

    // Validate that messages exist
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    console.log('Received messages:', messages);

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4", // or "gpt-3.5-turbo" if you prefer
      messages: messages,
      temperature: 0.8, // Higher for more varied responses
      max_tokens: 150,
      presence_penalty: 0.6, // Helps avoid repetition
      frequency_penalty: 0.6, // Helps avoid repetition
    });

    const response = completion.choices[0].message.content;
    console.log('OpenAI response:', response);

    // Return just the content string
    res.status(200).json(response);
    
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
  }
}