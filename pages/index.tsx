import { useState, useRef } from 'react';

export default function Home() {
  const [pitch, setPitch] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coachTone, setCoachTone] = useState('friendly');
  const [persona, setPersona] = useState('newbie');
  const recognitionRef = useRef(null);

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const systemPrompt = `You are an AI sales coach giving ${coachTone} feedback. Analyze this pitch as if the user is talking to a ${persona}. Provide a JSON object with confidence, clarity, structure (1–10), and comments.`;
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
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 px-6 py-10 font-sans">
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-center">AI Sales Trainer</h1>

        <div>
          <label className="block font-semibold mb-1">Choose Feedback Tone:</label>
          <select
            value={coachTone}
            onChange={(e) => setCoachTone(e.target.value)}
            className="w-full p-2 rounded-lg border dark:bg-gray-800"
          >
            <option value="friendly">Friendly Mentor</option>
            <option value="tough">Tough Coach</option>
            <option value="peer">Peer-to-Peer</option>
            <option value="value">Value-Driven</option>
            <option value="decision">Decision-Maker</option>
            <option value="open">Open-Minded</option>
            <option value="best">Best Salesman in the World</option>
            <option value="closer">Closer</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold mb-1">Who Are You Pitching To?</label>
          <select
            value={persona}
            onChange={(e) => setPersona(e.target.value)}
            className="w-full p-2 rounded-lg border dark:bg-gray-800"
          >
            <option value="newbie">Completely New Person</option>
            <option value="decision-maker">Decision Maker</option>
            <option value="skeptical">Skeptical Prospect</option>
            <option value="executive">Time-Crunched Executive</option>
            <option value="budget">Budget-Conscious Buyer</option>
            <option value="technical">Technical Expert</option>
            <option value="emotional">Emotional Buyer</option>
            <option value="warm">Warm Lead</option>
            <option value="competitor">Competitor</option>
          </select>
        </div>

        <textarea
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          placeholder="Type or use voice to input your sales pitch..."
          rows={5}
          className="w-full p-3 border rounded-lg dark:bg-gray-800"
        />

        <div className="flex gap-4">
          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Analyzing...' : 'Submit Pitch'}
          </button>
          <button
            onClick={startVoice}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            Use Voice
          </button>
        </div>

        {feedback && (
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg mt-6">
            <h3 className="text-xl font-semibold mb-2">Feedback</h3>
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
