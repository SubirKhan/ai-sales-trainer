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
  const [history, setHistory] = useState<any[]>([]);
  const [insights, setInsights] = useState<string[]>([]);

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

        const insightsGenerated = generateTrainingInsights(results);
        setInsights(insightsGenerated);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setObjection('');
  }, [pitch, roleplay]);

  const generateTrainingInsights = (pitches: any[]) => {
    if (!pitches || pitches.length < 1) return [];

    const personaScores: any = {};
    const recent = pitches.slice(0, 5);
    const older = pitches.slice(-5);
    const metrics = Object.keys(initialScores);

    pitches.forEach(p => {
      const personaKey = p.persona || 'Unknown Persona';
      if (!personaScores[personaKey]) {
        personaScores[personaKey] = {
          count: 0,
          byMetric: { ...initialScores }
        };
      }

      metrics.forEach(metric => {
        const val = Number(p.feedback?.[metric]);
        if (!isNaN(val)) {
          personaScores[personaKey].byMetric[metric] += val;
        }
      });

      personaScores[personaKey].count += 1;
    });

    const insights: string[] = [];

    for (const persona in personaScores) {
      const { byMetric, count } = personaScores[persona];
      for (const metric of metrics) {
        const avg = byMetric[metric] / count;
        if (avg < 6) {
          insights.push(`🧠 You often score lower on ${metric} when pitching to ${persona}.`);
        }
      }
    }

    metrics.forEach(metric => {
      const avgOld = older.reduce((sum, p) => sum + (Number(p.feedback?.[metric]) || 0), 0) / older.length;
      const avgRecent = recent.reduce((sum, p) => sum + (Number(p.feedback?.[metric]) || 0), 0) / recent.length;
      const diff = avgRecent - avgOld;
      if (Math.abs(diff) > 1) {
        const direction = diff > 0 ? 'improved' : 'dropped';
        const emoji = diff > 0 ? '📈' : '📉';
        insights.push(`${emoji} Your ${metric} score has ${direction} by ${Math.abs(diff).toFixed(1)} in recent pitches.`);
      }
    });

    return insights;
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

      if (user) {
        console.log('✅ USER UID:', user.uid);

        const pitchDoc = {
          uid: user.uid,
          pitch,
          feedback: data,
          persona,
          timestamp: serverTimestamp()
        };

        const debugDoc = {
          uid: user.uid,
          email: user.email,
          pitch,
          feedback: data,
          persona,
          tone: coachTone,
          objection: simulatedObjection || null,
          roleplay,
          timestamp: serverTimestamp()
        };

        try {
          console.log('📤 Writing pitchHistory...');
          await addDoc(collection(db, 'pitchHistory'), pitchDoc);
          console.log('✅ pitchHistory saved');

          await addDoc(collection(db, 'debugPitchLogs'), debugDoc);
          console.log('✅ debugPitchLogs saved');
        } catch (firestoreError) {
          console.error('❌ Firestore write error:', firestoreError);
          alert('⚠️ Firestore failed: ' + (firestoreError as any)?.message);
        }
      } else {
        console.warn('⚠️ No user logged in.');
      }

    } catch (err: any) {
      console.error('❌ API error:', err);
      alert('Error getting feedback: ' + err.message);
    }
    setIsLoading(false);
  };

  return (
    <div>
      {/* UI rendering code and interaction handlers go here */}
    </div>
  );
}
