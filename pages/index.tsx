import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Home() {
  const [pitch, setPitch] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coachTone, setCoachTone] = useState('friendly');
  const recognitionRef = useRef(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const systemPrompt = `You are an AI sales coach acting as a ${coachTone} coach. Analyze the user's sales pitch and return a JSON object with confidence, clarity, structure (rated 1-10), and comments. Also provide the strongest and weakest lines.`;
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

  const initialScores = {
    confidence: 0,
    clarity: 0,
    structure: 0
  };

  const radarData = [
    { subject: 'Confidence', A: feedback?.confidence || 0, fullMark: 10 },
    { subject: 'Clarity', A: feedback?.clarity || 0, fullMark: 10 },
    { subject: 'Structure', A: feedback?.structure || 0, fullMark: 10 }
  ];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 20 }}>
      <h1>AI Sales Trainer</h1>
      <p>Choose tone:</p>
      <select value={coachTone} onChange={(e) => setCoachTone(e.target.value)}>
        <option value="friendly">Friendly Mentor</option>
        <option value="tough">Tough Coach</option>
        <option value="peer">Peer-Level Trainer</option>
        <option value="closer">Closer</option>
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
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={30} domain={[0, 10]} />
              <Radar name="Feedback" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: '0.9rem', color: '#555', marginTop: 10 }}>
            <strong>Radar Key:</strong> Confidence, Clarity, Structure – each rated out of 10.
          </p>
          <p><strong>Confidence:</strong> {feedback.confidence}</p>
          <p><strong>Clarity:</strong> {feedback.clarity}</p>
          <p><strong>Structure:</strong> {feedback.structure}</p>
          <p><strong>Strongest Line:</strong> {feedback.strongestLine}</p>
          <p><strong>Weakest Line:</strong> {feedback.weakestLine}</p>
          <p><strong>Comments:</strong> {feedback.comments}</p>
        </div>
      )}
    </div>
  );
}
