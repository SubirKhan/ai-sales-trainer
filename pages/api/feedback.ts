import { NextApiRequest, NextApiResponse } from 'next';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request format' });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7
    });

   const reply = completion.choices[0]?.message?.content;
console.log("🧠 AI Response:", reply);

const jsonMatch = reply?.match(/\{[\s\S]*\}/);
console.log("📦 Matched JSON:", jsonMatch);
      
    if (!jsonMatch) {
      return res.status(500).json({ error: 'Failed to parse structured feedback from AI response.' });
    }

    const feedback = JSON.parse(jsonMatch[0]);
    return res.status(200).json(feedback);
  } catch (error) {
    console.error('OpenAI API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
