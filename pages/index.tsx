import { useState, useRef } from 'react';

export default function Home() {
  const [pitch, setPitch] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coachTone, setCoachTone] = useState('friendly');
  const recognitionRef = useRef(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const systemPrompt = `You are an AI sales coach acting as a ${coachTone} coach. Analyze the user's sales pitch and return a JSON object with confidence, clarity, structure (rated 1-10), and comments.`;
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
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>AI Sales Trainer</h1>

      <label style={{ fontWeight: '600' }}>Choose Tone:</label>
      <select
        value={coachTone}
        onChange={(e) => setCoachTone(e.target.value)}
        style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem' }}
      >
        <option value="friendly">Friendly Mentor</option>
        <option value="tough">Tough Coach</option>
        <option value="peer">Peer-Level Trainer</option>
        <option value="value">Value-Driven</option>
        <option value="executive">Decision-Makers</option>
        <option value="open">Open-Mindedness</option>
        <option value="master">Best Salesman in the World</option>
        <option value="novice">Complete New Person</option>
      </select>

      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        placeholder="Type or use voice to input your sales pitch..."
        rows={6}
        style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginBottom: '1rem' }}
      />

      <div style={{ display: 'flex', gap: '1rem' }}>
        <button onClick={handleSubmit} disabled={isLoading} style={{ padding: '0.5rem 1rem' }}>
          {isLoading ? 'Analyzing...' : 'Submit Pitch'}
        </button>
        <button onClick={startVoice} style={{ padding: '0.5rem 1rem' }}>
          Use Voice
        </button>
      </div>

      {feedback && (
        <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '6px' }}>
          <h3 style={{ marginBottom: '1rem' }}>Feedback</h3>
          <p><strong>Confidence:</strong> {feedback.confidence}</p>
          <p><strong>Clarity:</strong> {feedback.clarity}</p>
          <p><strong>Structure:</strong> {feedback.structure}</p>
          <p><strong>Comments:</strong> {feedback.comments}</p>
        </div>
      )}
    </div>
  );
}
