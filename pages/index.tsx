import { useState, useRef } from 'react';
import Head from 'next/head';

export default function Home() {
  const [pitch, setPitch] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coachTone, setCoachTone] = useState('friendly');
  const [pitchPersona, setPitchPersona] = useState('new-person');
  const recognitionRef = useRef(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const systemPrompt = `You are an AI sales coach acting as a ${coachTone} coach. Analyze the user's sales pitch targeted at a ${pitchPersona} and return a JSON object with confidence, clarity, structure (rated 1-10), and comments.`;
      const userPrompt = `Sales Pitch: ${pitch}`;

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        })
      });

      const data = await response.json();
      setFeedback(data);
    } catch (err) {
      alert('Error getting feedback: ' + err.message);
    }
    setIsLoading(false);
  };

  const startVoice = () => {
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) return alert('Speech recognition not supported');

      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.onresult = (event) => {
        setPitch(event.results[0][0].transcript);
      };
      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      alert('Voice input failed: ' + err.message);
    }
  };

  return (
    <div>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Nunito&display=swap" rel="stylesheet" />
      </Head>
      <div
        style={{
          fontFamily: 'Nunito, sans-serif',
          maxWidth: 600,
          margin: '0 auto',
          padding: '2rem 1rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          backgroundColor: '#fffaf5',
          color: '#333',
          borderRadius: '1rem',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
        }}
      >
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>AI Sales Trainer</h1>

        <label style={{ marginBottom: 4 }}>Choose Feedback Tone:</label>
        <select
          value={coachTone}
          onChange={(e) => setCoachTone(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            border: '1px solid #ccc',
          }}
        >
          <option value="friendly">Friendly Mentor</option>
          <option value="tough">Tough Coach</option>
          <option value="peer">Peer-Level Trainer</option>
          <option value="value">Value-Driven</option>
          <option value="decision">Best Salesman in the World</option>
          <option value="openness">Open-Mindedness</option>
          <option value="closer">Closer</option>
        </select>

        <label style={{ marginBottom: 4 }}>Who Are You Pitching To?</label>
        <select
          value={pitchPersona}
          onChange={(e) => setPitchPersona(e.target.value)}
          style={{
            width: '100%',
            padding: '0.5rem',
            borderRadius: '0.5rem',
            marginBottom: '1rem',
            border: '1px solid #ccc',
          }}
        >
          <option value="new-person">Completely New Person</option>
          <option value="decision-maker">Decision Maker</option>
          <option value="skeptical">Skeptical Prospect</option>
          <option value="time-crunched">Time-Crunched Executive</option>
          <option value="budget">Budget-Conscious Buyer</option>
          <option value="technical">Technical Expert</option>
          <option value="emotional">Emotional Buyer</option>
          <option value="warm">Warm Lead</option>
          <option value="competitor">Competitor</option>
        </select>

        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder="Type or use voice to input your sales pitch..."
          rows={6}
          style={{
            width: '100%',
            borderRadius: '0.5rem',
            padding: '1rem',
            border: '1px solid #ccc',
            marginBottom: '1rem',
            fontFamily: 'inherit',
          }}
        />

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: '#ffe0b3',
              cursor: 'pointer',
            }}
          >
            {isLoading ? 'Analyzing...' : 'Submit Pitch'}
          </button>
          <button
            onClick={startVoice}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              backgroundColor: '#ffd9cc',
              cursor: 'pointer',
            }}
          >
            Use Voice
          </button>
        </div>

        {feedback && (
          <div style={{ marginTop: 20 }}>
            <h3>Feedback</h3>
            <p><strong>Confidence:</strong> {feedback.confidence}</p>
            <p><strong>Clarity:</strong> {feedback.clarity}</p>
            <p><strong>Structure:</strong> {feedback.structure}</p>
            <p><strong>Comments:</strong> {feedback.comments}</p>
          </div>
        )}
      </div>
    </div>
  );
}
