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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const recognitionRef = useRef<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [multiPitchData, setMultiPitchData] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const q = query(
          collection(db, 'pitchHistory'),
          where('uid', '==', currentUser.uid),
          orderBy('timestamp', 'desc')
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setHistory(results);
        setMultiPitchData(results.slice(0, 3));
      }
    });
    return () => unsubscribe();
  }, []);

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
      const systemPrompt = `You are an AI sales coach acting as a ${coachTone} coach. Analyze the user's sales pitch as if they were pitching to a ${persona} and return a JSON object with confidence, clarity, structure, authenticity, persuasiveness (rated 0-10), strongestLine, weakestLine, and comments.`;
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

      if (user) {
        await addDoc(collection(db, 'pitchHistory'), {
          uid: user.uid,
          pitch,
          feedback: data,
          timestamp: serverTimestamp()
        });
      }
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
    <div style={{ fontFamily: 'Nunito, sans-serif', maxWidth: 1000, margin: '0 auto', padding: 40 }}>
      <h1 style={{ fontSize: '2rem', textAlign: 'center' }}>AI Sales Trainer</h1>

      {!user ? (
        <div style={{ marginBottom: 20 }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" />
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleSignup}>Sign Up</button>
          <button onClick={handleGoogleSignIn}>Sign In with Google</button>
        </div>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
          <span>Welcome, {user.email}</span>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}

      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        placeholder="Type your pitch here..."
        rows={5}
        style={{ width: '100%', padding: 12, marginBottom: 20 }}
      />

      <div style={{ marginBottom: 20 }}>
        <select value={coachTone} onChange={e => setCoachTone(e.target.value)}>
          {toneOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        <select value={persona} onChange={e => setPersona(e.target.value)}>
          {personaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleSubmit} disabled={isLoading}>{isLoading ? 'Analyzing...' : 'Submit Pitch'}</button>
        <button onClick={startVoice}>Use Voice</button>
        <button onClick={exportToPDF}>Download PDF</button>
      </div>

      {feedback && (
        <div style={{ marginTop: 30 }}>
          <h3>Feedback Summary:</h3>
          <ul>
            <li>Confidence: {feedback.confidence}</li>
            <li>Clarity: {feedback.clarity}</li>
            <li>Structure: {feedback.structure}</li>
            <li>Authenticity: {feedback.authenticity}</li>
            <li>Persuasiveness: {feedback.persuasiveness}</li>
            <li>Strongest Line: {feedback.strongestLine}</li>
            <li>Weakest Line: {feedback.weakestLine}</li>
            <li>Comments: {feedback.comments}</li>
          </ul>

          <div style={{ marginTop: 20, height: 300 }}>
            <ResponsiveContainer>
              <RadarChart data={radarData} outerRadius={90}>
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

      {multiPitchData.length > 0 && (
        <div style={{ marginTop: 50 }}>
          <h3>Multi-Pitch Comparison</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {multiPitchData.map((entry, idx) => {
              const radarData = Object.entries(entry.feedback)
                .filter(([key]) => initialScores.hasOwnProperty(key))
                .map(([key, value]) => ({ subject: key, A: value, fullMark: 10 }));

              return (
                <div key={entry.id} style={{ flex: 1, minWidth: 300, margin: '20px 10px' }}>
                  <h4>{`Pitch ${idx + 1}`}</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart outerRadius={90} data={radarData}>
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, 10]} />
                      <Radar
                        name={`Pitch ${idx + 1}`}
                        dataKey="A"
                        stroke="#82ca9d"
                        fill="#82ca9d"
                        fillOpacity={0.4}
                      />
                      <Tooltip />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
