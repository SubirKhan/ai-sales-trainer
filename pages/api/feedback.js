// pages/api/feedback.js or app/api/feedback/route.js (depending on your Next.js version)

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

    // Validate request body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request body. Messages array required.' });
    }

    // Validate messages format
    for (const message of messages) {
      if (!message.role || !message.content) {
        return res.status(400).json({ error: 'Invalid message format. Role and content required.' });
      }
      if (!['system', 'user', 'assistant'].includes(message.role)) {
        return res.status(400).json({ error: 'Invalid message role. Must be system, user, or assistant.' });
      }
    }

    console.log('API: Sending request to OpenAI with', messages.length, 'messages');
    console.log('API: System prompt length:', messages[0]?.content?.length || 0);

    // Make request to OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using the faster, cheaper model for training
      messages: messages,
      max_tokens: 500, // Reasonable limit for sales training responses
      temperature: 0.8, // Slight randomness for variety in responses
      presence_penalty: 0.3, // Encourage varied responses
      frequency_penalty: 0.3, // Reduce repetition
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response generated from OpenAI');
    }

    console.log('API: Received response:', response.substring(0, 100) + '...');

    // Try to parse as JSON first (for structured feedback)
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
      console.log('API: Successfully parsed JSON response');
      return res.status(200).json(parsedResponse);
    } catch (parseError) {
      // If not JSON, return as plain text (for roleplay responses)
      console.log('API: Returning plain text response');
      return res.status(200).json({ content: response.trim() });
    }

  } catch (error) {
    console.error('API Error:', error);
    
    // Handle specific OpenAI errors
    if (error.status === 429) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Please try again in a moment.' 
      });
    }
    
    if (error.status === 401) {
      return res.status(500).json({ 
        error: 'API authentication failed. Please check configuration.' 
      });
    }
    
    if (error.status === 400) {
      return res.status(400).json({ 
        error: 'Invalid request to OpenAI. Please check your input.' 
      });
    }

    // Generic error response
    return res.status(500).json({ 
      error: 'Failed to generate AI response. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// For App Router (Next.js 13+), use this format instead:
/*
export async function POST(request) {
  try {
    const { messages } = await request.json();

    // Same validation and processing logic as above...

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: messages,
      max_tokens: 500,
      temperature: 0.8,
      presence_penalty: 0.3,
      frequency_penalty: 0.3,
    });

    const response = completion.choices[0]?.message?.content;
    
    if (!response) {
      throw new Error('No response generated from OpenAI');
    }

    // Try to parse as JSON first
    try {
      const parsedResponse = JSON.parse(response);
      return Response.json(parsedResponse);
    } catch (parseError) {
      return Response.json({ content: response.trim() });
    }

  } catch (error) {
    console.error('API Error:', error);
    return Response.json({ 
      error: 'Failed to generate AI response. Please try again.' 
    }, { status: 500 });
  }
}
*/