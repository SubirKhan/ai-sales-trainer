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
  const [roleplayObjection, setRoleplayObjection] = useState('');
  const [script, setScript] = useState<string>('');
  const [showComparison, setShowComparison] = useState(false);
  const [selectedPitches, setSelectedPitches] = useState<any[]>([]);

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

  const handleScriptUpload = (e: any) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setScript(evt.target?.result as string);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    try {
      const systemPrompt = `You are an AI sales coach acting as a ${coachTone} coach. Analyze the user's sales pitch as if they were pitching to a ${persona} and return a JSON object with confidence, clarity, structure, authenticity, persuasiveness (rated 0-10), strongestLine, weakestLine, and comments. Include a realistic roleplay objection.`;
      const userPrompt = `${script ? `Company Sales Script: ${script}\n\n` : ''}Sales Pitch: ${pitch}`;

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
      setRoleplayObjection(data.roleplayObjection || '');

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

  const toggleSelectedPitch = (entry: any) => {
    const exists = selectedPitches.find(p => p.id === entry.id);
    if (exists) {
      setSelectedPitches(prev => prev.filter(p => p.id !== entry.id));
    } else {
      setSelectedPitches(prev => [...prev, entry]);
    }
  };

  return (
    <div style={{ padding: 30, fontFamily: 'Nunito' }}>
      <h1 style={{ fontSize: '2.2rem', marginBottom: 20 }}>AI Sales Trainer</h1>

      {!user ? (
        <div>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input placeholder="Password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          <button onClick={handleLogin}>Login</button>
          <button onClick={handleSignup}>Sign Up</button>
          <button onClick={handleGoogleSignIn}>Sign in with Google</button>
        </div>
      ) : (
        <div>
          <p>Welcome, {user.displayName || user.email}</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      )}

      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        placeholder="Type or speak your pitch..."
        rows={5}
        style={{ width: '100%', padding: 12, fontSize: 16, marginTop: 20 }}
      />

      {roleplayObjection && (
        <p style={{ background: '#f9f9f9', padding: 10, borderRadius: 8, marginTop: 10 }}>
          <strong>Roleplay Objection:</strong> {roleplayObjection}
        </p>
      )}

      <input type="file" onChange={handleScriptUpload} accept=".txt" style={{ marginTop: 10 }} />

      <button onClick={handleSubmit} disabled={isLoading}>
        {isLoading ? 'Analyzing...' : 'Submit'}
      </button>

      {feedback && (
        <>
          <h3 style={{ marginTop: 30 }}>Feedback Summary:</h3>
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

          <div style={{ height: 300 }}>
            <ResponsiveContainer>
              <RadarChart data={Object.entries(feedback).filter(([key]) => initialScores.hasOwnProperty(key)).map(([key, value]) => ({ subject: key, A: value, fullMark: 10 }))}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 10]} />
                <Radar name="Feedback" dataKey="A" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {history.length > 0 && (
        <div style={{ marginTop: 40 }}>
          <h3>Pitch History</h3>
          <label>
            <input
              type="checkbox"
              checked={showComparison}
              onChange={() => setShowComparison(!showComparison)}
              style={{ marginRight: 8 }}
            />
            Compare Selected
          </label>
          <ul style={{ paddingLeft: 0 }}>
            {history.map(entry => (
              <li key={entry.id} style={{ marginBottom: 12, listStyle: 'none', background: '#fff', padding: 10, borderRadius: 8 }}>
                <input
                  type="checkbox"
                  checked={selectedPitches.some(p => p.id === entry.id)}
                  onChange={() => toggleSelectedPitch(entry)}
                  style={{ marginRight: 6 }}
                />
                <strong>Pitch:</strong> {entry.pitch}<br />
                <strong>Date:</strong> {entry.timestamp?.toDate().toLocaleString() || 'N/A'}
              </li>
            ))}
          </ul>
        </div>
      )}

      {showComparison && selectedPitches.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <h3>Multi-Pitch Comparison</h3>
          <ResponsiveContainer width="100%" height={350}>
            <RadarChart outerRadius={120}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={30} domain={[0, 10]} />
              {selectedPitches.map((entry, idx) => (
                <Radar
                  key={entry.id}
                  name={`Pitch ${idx + 1}`}
                  data={Object.entries(entry.feedback).filter(([key]) => initialScores.hasOwnProperty(key)).map(([key, value]) => ({ subject: key, A: value, fullMark: 10 }))}
                  dataKey="A"
                  stroke="#82ca9d"
                  fillOpacity={0.4}
                  fill="#82ca9d"
                />
              ))}
              <Tooltip />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
