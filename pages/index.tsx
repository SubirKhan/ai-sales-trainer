import { useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer } from 'recharts';

const initialScores = {
  confidence: 0,
  clarity: 0,
  structure: 0,
  authenticity: 0,
  persuasiveness: 0
};

export default function Home() {
  const [pitch, setPitch] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coachTone, setCoachTone] = useState('friendly');
  const [persona, setPersona] = useState('new');
  const recognitionRef = useRef(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const systemPrompt = `You are an AI sales coach acting as a ${coachTone} coach. Analyze the user's sales pitch as if they were pitching to a ${persona} and return a JSON object with confidence, clarity, structure, authenticity, persuasiveness (rated 1-10), and comments.`;
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

  const toneOptions = [
    { value: 'friendly', label: 'Friendly Mentor' },
    { value: 'tough', label: 'Tough Coach' },
    { value: 'peer', label: 'Peer-Level Trainer' },
    { value: 'closer', label: 'Closer' },
    { value: 'best', label: 'Best Salesman in the World' }
  ];

  const personaOptions = [
    { value: 'new', label: 'Completely New Person' },
    { value: 'decision', label: 'Decision Maker' },
    { value: 'skeptical', label: 'Skeptical Prospect' },
    { value: 'executive', label: 'Time-Crunched Executive' },
    { value: 'budget', label: 'Budget-Conscious Buyer' },
    { value: 'technical', label: 'Technical Expert' },
    { value: 'emotional', label: 'Emotional Buyer' },
    { value: 'warm', label: 'Warm Lead' },
    { value: 'competitor', label: 'Competitor (Fishing for Info)' }
  ];

  const radarData = feedback
    ? Object.entries(feedback)
        .filter(([key]) => initialScores.hasOwnProperty(key))
        .map(([key, value]) => ({ subject: key, A: value, fullMark: 10 }))
    : [];

  return (
    <div style={{ fontFamily: 'Nunito, sans-serif', maxWidth: 800, margin: '0 auto', padding: 30, backgroundColor: '#faf8f5', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>AI Sales Trainer</h1>

      <label style={{ fontWeight: 'bold' }}>Choose Feedback Tone:</label>
      <select value={coachTone} onChange={(e) => setCoachTone(e.target.value)} style={{ marginBottom: 20, padding: 6, width: '100%' }}>
        {toneOptions.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <label style={{ fontWeight: 'bold' }}>Who Are You Pitching To?</label>
      <select value={persona} onChange={(e) => setPersona(e.target.value)} style={{ marginBottom: 20, padding: 6, width: '100%' }}>
        {personaOptions.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        placeholder="Type or use voice to input your sales pitch..."
        rows={6}
        style={{ width: '100%', marginBottom: 10, borderRadius: 10, padding: 10, fontSize: '1rem' }}
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <button onClick={handleSubmit} disabled={isLoading} style={{ padding: '10px 16px', borderRadius: 8 }}>
          {isLoading ? 'Analyzing...' : 'Submit Pitch'}
        </button>
        <button onClick={startVoice} style={{ padding: '10px 16px', borderRadius: 8 }}>Use Voice</button>
      </div>

      {feedback && (
        <div style={{ marginTop: 30 }}>
          <h3>Feedback</h3>
          <p><strong>Confidence:</strong> {feedback.confidence}</p>
          <p><strong>Clarity:</strong> {feedback.clarity}</p>
          <p><strong>Structure:</strong> {feedback.structure}</p>
          <p><strong>Authenticity:</strong> {feedback.authenticity}</p>
          <p><strong>Persuasiveness:</strong> {feedback.persuasiveness}</p>
          <p><strong>Comments:</strong> {feedback.comments}</p>

          <div style={{ marginTop: 30, height: 300 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 10]} />
                <Radar name="Feedback" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
