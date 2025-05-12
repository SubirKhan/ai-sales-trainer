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
  const [feedback, setFeedback] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [coachTone, setCoachTone] = useState('friendly');
  const [persona, setPersona] = useState('new');
  const [roleplay, setRoleplay] = useState(false);
  const [objection, setObjection] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const recognitionRef = useRef(null);
  const [user, setUser] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [roleplayResponse, setRoleplayResponse] = useState('');
  const [isFirstRoleplay, setIsFirstRoleplay] = useState(true);
  const [roleplayStarted, setRoleplayStarted] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Modified roleplay effect to prevent automatic message sending
  useEffect(() => {
    if (roleplay) {
      // Reset conversation state when enabling roleplay mode
      setIsFirstRoleplay(true);
      setRoleplayStarted(false);
      setConversation([]);
      setPitch(''); // Clear pitch input when enabling roleplay
    } else {
      // Reset when disabling roleplay
      setObjection('');
      setConversation([]);
      setRoleplayStarted(false);
      setRoleplayResponse(''); // Clear roleplay response when disabling
    }
  }, [roleplay]);

  // Function to handle initial roleplay setup - only called when explicitly triggered
  const startRoleplay = () => {
    if (!roleplayStarted && pitch.trim()) {
      // Start roleplay with user's initial pitch
      setConversation([{ role: 'user', content: pitch }]);
      generateInitialObjection(pitch);
      setRoleplayStarted(true);
      setIsFirstRoleplay(false);
      setPitch(''); // Clear pitch input after starting roleplay
    }
  };

  const generateInitialObjection = async (userPitch) => {
    if (!userPitch || !userPitch.trim()) return;
    
    setIsTyping(true);
    try {
      const systemPrompt = `You are roleplaying as a ${persona} prospect. Based on the user's sales pitch, generate a realistic objection or question that such a prospect might have. Keep it brief (1-2 sentences) and realistic. Just respond with the objection text only.`;

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPitch }
          ]
        })
      });

      const data = await response.json();
      const newObjection = typeof data === 'string' ? data : (data.content || "That's interesting, but what makes your product different from what I'm currently using?");
      
      setObjection(newObjection);
      // Add prospect's response to conversation
      setConversation(prev => [
        ...prev,
        { role: 'prospect', content: newObjection }
      ]);
    } catch (err) {
      console.error("Error generating objection:", err);
      const fallbackMessage = "I'm not sure about that. Can you tell me more?";
      setObjection(fallbackMessage);
      setConversation(prev => [
        ...prev,
        { role: 'prospect', content: fallbackMessage }
      ]);
    }
    setIsTyping(false);
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (err) {
      alert('Google Sign-In failed: ' + err.message);
    }
  };

  const handleSignup = async () => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert('Signup failed: ' + err.message);
    }
  };

  const handleLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      alert('Login failed: ' + err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      alert('Logout failed: ' + err.message);
    }
  };

  const generateObjection = async (userMessage) => {
    if (!userMessage || !userMessage.trim()) return;
    
    setIsTyping(true);
    try {
      const systemPrompt = `You are roleplaying as a ${persona} prospect. Based on the user's sales pitch, generate a realistic objection or question that such a prospect might have. Keep it brief (1-2 sentences) and realistic. Just respond with the objection text only.`;

      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage }
          ]
        })
      });

      const data = await response.json();
      const newObjection = typeof data === 'string' ? data : (data.content || "That's interesting, but what makes your product different from what I'm currently using?");
      
      setObjection(newObjection);
      // Add prospect's response to conversation
      setConversation(prev => [
        ...prev, 
        { role: 'prospect', content: newObjection }
      ]);
    } catch (err) {
      console.error("Error generating objection:", err);
      const fallbackMessage = "I'm not sure about that. Can you tell me more?";
      setObjection(fallbackMessage);
      setConversation(prev => [
        ...prev, 
        { role: 'prospect', content: fallbackMessage }
      ]);
    }
    setIsTyping(false);
  };

  const handleSubmit = async () => {
    if (!pitch.trim()) return;
    
    if (roleplay && !roleplayStarted) {
      // If in roleplay mode and it's not started yet, start the roleplay
      startRoleplay();
      return;
    }
    
    setIsLoading(true);
    try {
      const systemPrompt = `You are an expert AI sales coach with a ${coachTone} tone. Be highly critical and honest. Evaluate the user's sales pitch as if they were pitching to a ${persona}. Penalize vague, short, or generic phrases. Only give high scores if the pitch shows clear structure, relevance, credibility, and persuasive reasoning. Return a JSON object with confidence, clarity, structure, authenticity, persuasiveness (rated 0-10), strongestLine, weakestLine, and comments.`;

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

  // Modified to ensure messages are only sent when explicitly triggered
  const handleSendRoleplayResponse = () => {
    if (!roleplayResponse.trim()) return;
    
    // Only proceed if roleplay has been started properly
    if (roleplayStarted) {
      // Add user message to conversation only when explicitly sending
      setConversation(prev => [
        ...prev,
        { role: 'user', content: roleplayResponse }
      ]);
      
      // Save the response and clear the input field
      const userMessage = roleplayResponse;
      setRoleplayResponse('');
      
      // Generate AI response after sending the user message
      generateObjection(userMessage);
    }
  };

  const handleRoleplayKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendRoleplayResponse();
    }
  };

  const exportToPDF = () => {
    if (!feedback && conversation.length === 0) return;
    
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(16);
    
    if (roleplay && conversation.length > 0) {
      doc.text('AI Sales Roleplay Conversation', 20, 20);
      doc.setFontSize(12);
      
      let yPosition = 40;
      conversation.forEach((message, index) => {
        const prefix = message.role === 'user' ? 'You: ' : `${persona} Prospect: `;
        const lines = doc.splitTextToSize(prefix + message.content, 170);
        
        doc.text(lines, 20, yPosition);
        yPosition += 10 * lines.length + 5;
        
        // Add a separator line except after the last message
        if (index < conversation.length - 1) {
          doc.setDrawColor(200);
          doc.line(20, yPosition - 2, 190, yPosition - 2);
        }
      });
    } else if (feedback) {
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
    }
    
    doc.save(roleplay ? 'sales-roleplay.pdf' : 'sales-feedback.pdf');
  };

  const startVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Speech recognition not supported');

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.onresult = (event) => {
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
    <div style={{ fontFamily: 'Nunito, sans-serif', maxWidth: 1200, margin: '0 auto', padding: 40, backgroundColor: '#f8f8ff', borderRadius: 18 }}>
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

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Feedback Tone:</label>
          <select value={coachTone} onChange={(e) => setCoachTone(e.target.value)} style={{ width: '100%', padding: 8 }}>
            {toneOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Who Are You Pitching To?</label>
          <select value={persona} onChange={(e) => setPersona(e.target.value)} style={{ width: '100%', padding: 8 }}>
            {personaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input 
            type="checkbox" 
            checked={roleplay} 
            onChange={(e) => setRoleplay(e.target.checked)} 
            id="roleplay-toggle"
          />
          <label htmlFor="roleplay-toggle" style={{ fontWeight: 'bold' }}>
            Enable Interactive Roleplay
          </label>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: roleplay ? 'nowrap' : 'wrap' }}>
        {/* Left side - Original pitch and feedback section */}
        <div style={{ flex: roleplay ? 1 : '100%', minWidth: roleplay ? 400 : 'auto' }}>
          <textarea
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            placeholder={roleplay ? "Enter your initial pitch here..." : "Your pitch here..."}
            rows={5}
            style={{ 
              width: '100%', 
              padding: 12, 
              fontSize: 16, 
              borderRadius: 8, 
              marginBottom: 20,
              resize: 'vertical'
            }}
          />

          {objection && !roleplay && (
            <div style={{ 
              backgroundColor: '#fff3cd', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: 20, 
              border: '1px solid #ffeeba' 
            }}>
              <strong>Objection:</strong> {objection}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            <button 
              onClick={handleSubmit} 
              disabled={isLoading || !pitch.trim()}
            >
              {isLoading ? 'Analyzing...' : (roleplay && !roleplayStarted) ? 'Start Roleplay' : 'Submit Pitch'}
            </button>
            <button onClick={startVoice}>Use Voice</button>
            <button onClick={exportToPDF} disabled={!feedback && conversation.length === 0}>Download PDF</button>
          </div>

          {feedback && !roleplay && (
            <div style={{ marginTop: 20 }}>
              <h3>Feedback Summary:</h3>
              <ul style={{ marginBottom: 20 }}>
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

        {/* Right side - Interactive roleplay conversation */}
        {roleplay && (
          <div style={{ flex: 1, minWidth: 400 }}>
            <h3>Roleplay Conversation:</h3>
            <div style={{ 
              backgroundColor: '#f0f8ff', 
              borderRadius: 8, 
              padding: 16, 
              height: 400, 
              overflowY: 'auto',
              border: '1px solid #e1e4e8',
              marginBottom: 12
            }}>
              {conversation.length > 0 ? (
                conversation.map((message, index) => (
                  <div key={index} style={{ 
                    marginBottom: 12,
                    backgroundColor: message.role === 'user' ? '#e3f2fd' : '#fff',
                    padding: 10,
                    borderRadius: 6,
                    maxWidth: '80%',
                    marginLeft: message.role === 'user' ? 'auto' : '0'
                  }}>
                    <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                      {message.role === 'user' ? 'You' : `${personaOptions.find(p => p.value === persona)?.label || 'Prospect'}`}:
                    </div>
                    <div>{message.content}</div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#666', padding: 20 }}>
                  {roleplay ? 
                    "Enter your initial pitch in the main pitch area and click 'Start Roleplay' to begin" : 
                    "No conversation yet"}
                </div>
              )}
              {isTyping && (
                <div style={{ padding: 10, fontStyle: 'italic', color: '#666' }}>
                  Prospect is typing...
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'stretch' }}>
              <textarea
                value={roleplayResponse}
                onChange={(e) => setRoleplayResponse(e.target.value)}
                onKeyPress={handleRoleplayKeyPress}
                placeholder={roleplayStarted ? "Type your response..." : "Start roleplay first to enable this input"}
                style={{ 
                  flex: 1, 
                  padding: 10, 
                  fontSize: 16, 
                  borderRadius: '8px 0 0 8px', 
                  resize: 'none',
                  minHeight: 60,
                  opacity: roleplayStarted ? 1 : 0.7
                }}
                disabled={!roleplayStarted}
              />
              <button 
                onClick={handleSendRoleplayResponse}
                disabled={isTyping || !roleplayResponse.trim() || !roleplayStarted}
                style={{ 
                  borderRadius: '0 8px 8px 0',
                  border: '1px solid #ccc',
                  borderLeft: 'none',
                  padding: '0 16px',
                  opacity: (roleplayStarted && roleplayResponse.trim() && !isTyping) ? 1 : 0.7
                }}
              >
                Send
              </button>
            </div>
            
            {!roleplayStarted && roleplay && (
              <div style={{ marginTop: 8, fontSize: 13, color: '#666', textAlign: 'center' }}>
                Submit your initial pitch to start the roleplay conversation
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}