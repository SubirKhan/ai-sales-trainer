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
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>
      <h1>AI Sales Trainer</h1>
      <p>Choose tone:</p>
      <select value={coachTone} onChange={(e) => setCoachTone(e.target.value)}>
        <option value="friendly">Friendly Mentor</option>
        <option value="tough">Tough Coach</option>
        <option value="peer">Peer-Level Trainer</option>
      </select>

      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        placeholder="Type or use voice to input your sales pitch..."
        rows={6}
        style={{ width: '100%', marginTop: 10 }}
      />
      <div style={{ marginTop: 10 }}>
        <button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? 'Analyzing...' : 'Submit Pitch'}
        </button>
        <button onClick={startVoice} style={{ marginLeft: 10 }}>
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
  );
}
