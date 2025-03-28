import { useState, useRef, useEffect } from 'react';
import {
  signInWithPopup, GoogleAuthProvider, signOut,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, User
} from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import {
  collection, addDoc, serverTimestamp,
  query, where, orderBy, getDocs
} from 'firebase/firestore';
import jsPDF from 'jspdf';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, ResponsiveContainer
} from 'recharts';

const initialScores = {
  confidence: 0,
  clarity: 0,
  structure: 0,
  authenticity: 0,
  persuasiveness: 0
};

export default function Home() {
  const [pitch, setPitch] = useState('');
  const [feedback, setFeedback] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coachTone, setCoachTone] = useState('friendly');
  const [persona, setPersona] = useState('new');
  const [roleplay, setRoleplay] = useState(false);
  const [objection, setObjection] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const recognitionRef = useRef<any>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setObjection('');
  }, [pitch, roleplay]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err: any) {
      alert('Google Sign-In failed: ' + err.message);
    }
  };

  const handleSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      alert('Signup failed: ' + err.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      alert('Login failed: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      alert('Logout failed: ' + err.message);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      let simulatedObjection = '';
      if (roleplay) {
        simulatedObjection = "I'm not sure I need your products. How are they different from what I currently use?";
        setObjection(simulatedObjection);
      }

      const systemPrompt = `You are an expert AI sales coach. Be highly critical and honest. Evaluate the user’s sales pitch as if they were pitching to a ${persona}. Penalize vague, short, or generic phrases. Only give high scores if the pitch shows clear structure, relevance, credibility, and persuasive reasoning. Return a JSON object with confidence, clarity, structure, authenticity, persuasiveness (rated 0-10), strongestLine, weakestLine, and comments.`;

      const userPrompt = `Sales Pitch: ${pitch}${roleplay ? `\nObjection: ${simulatedObjection}` : ''}`;

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
    } catch (err: any) {
      alert('Error getting feedback: ' + err.message);
    }
    setIsLoading(false);
  };

  const exportToPDF = () => {
    if (!feedback) return;
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text('AI Sales Trainer Feedback', 20, 20);
    doc.setFontSize(12);
    doc.text(`Confidence: ${feedback.confidence}`, 20, 40);
    doc.text(`Clarity: ${feedback.clarity}`, 20, 50);
    doc.text(`Structure: ${feedback.structure}`, 20, 60);
    doc.text(`Authenticity: ${feedback.authenticity}`, 20, 70);
    doc.text(`Persuasiveness: ${feedback.persuasiveness}`, 20, 80);
    doc.text(`Strongest Line: ${feedback.strongestLine || 'N/A'}`, 20, 95);
    doc.text(`Weakest Line: ${feedback.weakestLine || 'N/A'}`, 20, 105);
    doc.text('Comments:', 20, 120);
    doc.text(feedback.comments || 'No comments provided.', 20, 130, { maxWidth: 170 });
    doc.save('sales-feedback.pdf');
  };

  const startVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Speech recognition not supported');

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event: any) => {
      setPitch(event.results[0][0].transcript);
    };
    recognition.start();
    recognitionRef.current = recognition;
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
    <div style={{ fontFamily: 'Nunito, sans-serif', maxWidth: 900, margin: '0 auto', padding: 40, backgroundColor: '#f8f8ff', borderRadius: 18 }}>
      <h1 style={{ fontSize: '2.4rem', textAlign: 'center', marginBottom: 30 }}>AI Sales Trainer</h1>

      {!user ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          <button onClick={handleGoogleSignIn}>Sign in with Google</button>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleSignup}>Sign Up</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span>Welcome, {user.displayName || user.email}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}

      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        placeholder="Your pitch here..."
        rows={5}
        style={{ width: '100%', padding: 12, fontSize: 16, borderRadius: 8, marginBottom: 20 }}
      />

      {objection && (
        <div style={{ backgroundColor: '#fff3cd', padding: '12px 16px', borderRadius: '8px', marginBottom: 20, border: '1px solid #ffeeba' }}>
          <strong>Simulated Objection:</strong> {objection}
        </div>
      )}

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Feedback Tone:</label>
          <select value={coachTone} onChange={(e) => setCoachTone(e.target.value)} style={{ width: '100%', padding: 8 }}>
            {toneOptions.map(opt => <option key={opt.value} value={opt.value} title={opt.label}>{opt.label}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Who Are You Pitching To?</label>
          <select value={persona} onChange={(e) => setPersona(e.target.value)} style={{ width: '100%', padding: 8 }}>
            {personaOptions.map(opt => <option key={opt.value} value={opt.value} title={opt.label}>{opt.label}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={roleplay} onChange={e => setRoleplay(e.target.checked)} />
          <label style={{ fontWeight: 'bold' }}>Roleplay Objection</label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <button onClick={handleSubmit} disabled={isLoading}>{isLoading ? 'Analyzing...' : 'Submit Pitch'}</button>
        <button onClick={startVoice}>Use Voice</button>
        <button onClick={exportToPDF}>Download PDF</button>
      </div>

      {feedback && (
        <div style={{ marginTop: 40 }}>
          <h3>Feedback Summary:</h3>
          <ul>
            <li><strong>Confidence:</strong> {feedback.confidence}</li>
            <li><strong>Clarity:</strong> {feedback.clarity}</li>
            <li><strong>Structure:</strong> {feedback.structure}</li>
            <li><strong>Authenticity:</strong> {feedback.authenticity}</li>
            <li><strong>Persuasiveness:</strong> {feedback.persuasiveness}</li>
            <li><strong>Strongest Line:</strong> {feedback.strongestLine}</li>
            <li><strong>Weakest Line:</strong> {feedback.weakestLine}</li>
            <li><strong>Comments:</strong> {feedback.comments}</li>
          </ul>

          <div style={{ height: 300, marginTop: 30 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 10]} />
                <Radar name="Feedback" dataKey="A" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
