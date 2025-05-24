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
  const [isProcessingMessage, setIsProcessingMessage] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  
  // New state for adaptive challenging
  const [prospectEngagement, setProspectEngagement] = useState('neutral'); // 'cold', 'neutral', 'warm', 'hot'
  const [challengeLevel, setChallengeLevel] = useState(1); // 1-5, increases with good responses
  const [conversationPhase, setConversationPhase] = useState('discovery'); // 'discovery', 'presentation', 'objection_handling', 'closing', 'ended'

  // Add responsive handling
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  const isMobile = windowWidth < 768;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Modified roleplay effect to reset adaptive states
  useEffect(() => {
    if (roleplay) {
      // Reset conversation state when enabling roleplay mode
      setIsFirstRoleplay(true);
      setRoleplayStarted(false);
      setConversation([]);
      setPitch('');
      setRoleplayResponse('');
      // Reset adaptive states
      setProspectEngagement('neutral');
      setChallengeLevel(1);
      setConversationPhase('discovery');
    } else {
      // Reset when disabling roleplay
      setObjection('');
      setConversation([]);
      setRoleplayStarted(false);
      setRoleplayResponse('');
      setProspectEngagement('neutral');
      setChallengeLevel(1);
      setConversationPhase('discovery');
    }
    setIsProcessingMessage(false);
  }, [roleplay]);

  // Function to evaluate user response quality and adjust engagement
  const evaluateUserResponse = (userMessage) => {
    const message = userMessage.toLowerCase();
    let score = 0;
    
    // Positive indicators
    if (message.includes('because') || message.includes('specifically') || message.includes('for example')) score += 2;
    if (message.includes('save') || message.includes('increase') || message.includes('improve') || message.includes('reduce')) score += 2;
    if (message.includes('$') || message.includes('percent') || message.includes('%') || message.includes('roi')) score += 2;
    if (message.includes('proven') || message.includes('results') || message.includes('experience')) score += 1;
    if (message.length > 50) score += 1; // Detailed responses
    
    // Negative indicators
    if (message.includes('i think') || message.includes('maybe') || message.includes('probably')) score -= 1;
    if (message.includes('good') || message.includes('great') || message.includes('amazing')) score -= 1; // Generic adjectives
    if (message.length < 20) score -= 2; // Too brief
    if (message.includes('um') || message.includes('uh') || message.includes('like')) score -= 1;
    
    return score;
  };

  // Function to update engagement and challenge level
  const updateEngagementLevel = (userMessage) => {
    const responseScore = evaluateUserResponse(userMessage);
    
    // Update engagement based on response quality
    if (responseScore >= 4) {
      setProspectEngagement(prev => {
        if (prev === 'cold') return 'neutral';
        if (prev === 'neutral') return 'warm';
        if (prev === 'warm') return 'hot';
        return 'hot';
      });
      setChallengeLevel(prev => Math.min(prev + 1, 5));
    } else if (responseScore <= -2) {
      setProspectEngagement(prev => {
        if (prev === 'hot') return 'warm';
        if (prev === 'warm') return 'neutral';
        if (prev === 'neutral') return 'cold';
        return 'cold';
      });
      setChallengeLevel(prev => Math.max(prev - 1, 1));
    }
    
    // Update conversation phase based on engagement and message count
    const messageCount = conversation.length;
    if (messageCount > 8 && prospectEngagement === 'hot') {
      setConversationPhase('closing');
    } else if (messageCount > 6) {
      setConversationPhase('objection_handling');
    } else if (messageCount > 4) {
      setConversationPhase('presentation');
    }
    
    // End conversation if prospect becomes too cold
    if (prospectEngagement === 'cold' && messageCount > 4) {
      setConversationPhase('ended');
    }
  };

  // Function to handle initial roleplay setup
  const startRoleplay = async () => {
    if (!roleplayStarted && pitch.trim() && !isProcessingMessage) {
      setIsProcessingMessage(true);
      
      setConversation([{ role: 'user', content: pitch }]);
      setRoleplayStarted(true);
      setIsFirstRoleplay(false);
      
      await generateInitialObjection(pitch);
      
      setPitch('');
      setIsProcessingMessage(false);
    }
  };

  const generateInitialObjection = async (userPitch) => {
    if (!userPitch || !userPitch.trim()) return;
    
    setIsTyping(true);
    try {
      const systemPrompt = `You are an AI Sales Trainer roleplaying as a ${persona} prospect. Your GOAL is to help the user become a better salesperson by providing realistic, challenging interactions.

TRAINING AGENDA:
- Test the user's product knowledge and value proposition
- Challenge weak or vague responses with tough follow-up questions
- Simulate realistic buying concerns for a ${persona}
- Help the user practice handling objections and closing techniques
- Provide a progressively challenging experience

PERSONA CONTEXT: You are a ${persona}. This is their initial pitch.

Your response should:
- Be realistic for a ${persona} 
- Present a legitimate business concern or objection
- Test their knowledge without being impossible to answer
- Set the tone for a challenging but fair sales conversation

Respond with 1-2 sentences expressing a realistic initial concern or question.`;

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
      const newObjection = typeof data === 'string' ? data : (data.content || "That's interesting, but I need to understand the specific value this would bring to my business. What concrete results can you guarantee?");
      
      setObjection(newObjection);
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
    if (!userMessage || !userMessage.trim() || isProcessingMessage) return;
    
    setIsTyping(true);
    setIsProcessingMessage(true);
    
    try {
      // Update engagement based on user response quality
      updateEngagementLevel(userMessage);
      
      // Format conversation history
      const formattedConversation = [];
      conversation.forEach(msg => {
        formattedConversation.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
      formattedConversation.push({
        role: 'user',
        content: userMessage
      });
      
      // Enhanced adaptive system prompt
      const getEngagementBehavior = () => {
        switch(prospectEngagement) {
          case 'cold':
            return "You are losing interest. Be more skeptical, shorter in responses, and consider ending the conversation if they don't provide compelling value.";
          case 'neutral':
            return "You are cautiously interested but need convincing. Ask probing questions to test their knowledge.";
          case 'warm':
            return "You are becoming more interested. Ask more qualified questions about implementation, next steps, and specifics.";
          case 'hot':
            return "You are very interested but still need final convincing. Focus on timeline, budget, and decision-making process.";
          default:
            return "Maintain professional interest while testing their capabilities.";
        }
      };

      const getChallengeInstructions = () => {
        const baseInstructions = [
          "Ask tough, realistic questions that a real prospect would ask",
          "Test their product knowledge and value proposition",
          "Challenge vague or weak responses with follow-up questions"
        ];
        
        if (challengeLevel >= 3) {
          baseInstructions.push("Ask about competitors and why you should choose them");
          baseInstructions.push("Question their pricing and ROI claims");
        }
        
        if (challengeLevel >= 4) {
          baseInstructions.push("Bring up implementation concerns and potential risks");
          baseInstructions.push("Ask for specific case studies or references");
        }
        
        return baseInstructions.join(". ");
      };

      const getPhaseInstructions = () => {
        switch(conversationPhase) {
          case 'discovery':
            return "Focus on understanding their offering and asking qualifying questions.";
          case 'presentation':
            return "Challenge their value proposition and ask for specific benefits.";
          case 'objection_handling':
            return "Present realistic concerns and objections that need to be addressed.";
          case 'closing':
            return "Focus on decision-making process, timeline, and next steps.";
          case 'ended':
            return "The conversation should end. Express that you've heard enough and are not interested.";
          default:
            return "Engage naturally based on the conversation flow.";
        }
      };

      const systemPrompt = `You are an AI Sales Trainer roleplaying as a ${persona} prospect. Your GOAL is to help the user become a better salesperson.

CURRENT STATE:
- Engagement Level: ${prospectEngagement}
- Challenge Level: ${challengeLevel}/5
- Conversation Phase: ${conversationPhase}
- Coach Tone: ${coachTone}

BEHAVIORAL INSTRUCTIONS:
${getEngagementBehavior()}

CHALLENGE INSTRUCTIONS:
${getChallengeInstructions()}

PHASE INSTRUCTIONS:
${getPhaseInstructions()}

TRAINING RULES:
1. Respond differently to each message - never repeat responses
2. ${prospectEngagement === 'hot' ? 'Show strong interest but still challenge them' : prospectEngagement === 'cold' ? 'Be skeptical and consider ending the conversation' : 'Maintain professional interest while testing their capabilities'}
3. Ask questions that real ${persona} prospects would ask
4. Challenge weak responses immediately
5. Reward strong responses with increased engagement
6. Keep responses 1-3 sentences unless ending the conversation

${conversationPhase === 'ended' ? 'END the conversation by saying you are not interested and thanking them for their time.' : 'Continue the conversation with a challenging but fair response.'}`;
      
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...formattedConversation
          ]
        })
      });

      const data = await response.json();
      let newObjection = typeof data === 'string' ? data : (data.content || "I need more specific information about how this would work for my situation.");
      
      // Check for repetition and add variety
      const lastProspectMessage = [...conversation].reverse().find(msg => msg.role === 'prospect')?.content;
      if (lastProspectMessage && lastProspectMessage.toLowerCase() === newObjection.toLowerCase()) {
        newObjection += " Can you provide a specific example?";
      }
      
      setObjection(newObjection);
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
    setIsProcessingMessage(false);
  };

  const handleSubmit = async () => {
    if (!pitch.trim() || isProcessingMessage) return;
    
    setIsProcessingMessage(true);
    
    if (roleplay && !roleplayStarted) {
      await startRoleplay();
      setIsProcessingMessage(false);
      return;
    }
    
    setIsLoading(true);
    try {
      if (roleplay && roleplayStarted) {
        const userMessage = pitch;
        setPitch('');
        
        setConversation(prev => [
          ...prev,
          { role: 'user', content: userMessage }
        ]);
        
        await generateObjection(userMessage);
        setIsLoading(false);
        setIsProcessingMessage(false);
        return;
      }
      
      // Standard pitch evaluation (enhanced with coaching tone)
      const systemPrompt = `You are an expert AI sales coach with a ${coachTone} tone. Your goal is to help this person become a better salesperson.

Evaluate their sales pitch as if they were pitching to a ${persona}. Be critical and honest - this is training, not encouragement.

EVALUATION CRITERIA:
- Confidence: Do they sound sure of their value proposition?
- Clarity: Is their message clear and easy to understand?
- Structure: Is there a logical flow to their pitch?
- Authenticity: Does it sound genuine or scripted?
- Persuasiveness: Would this actually convince a ${persona} to take action?

Be tough on:
- Vague or generic statements
- Lack of specific benefits or ROI
- Missing value proposition
- Poor structure or rambling
- Weak closing or call-to-action

Return a JSON object with confidence, clarity, structure, authenticity, persuasiveness (rated 0-10), strongestLine, weakestLine, and detailed comments that will help them improve.`;

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
    setIsProcessingMessage(false);
  };

  const handleSendRoleplayResponse = async () => {
    if (!roleplayResponse.trim() || !roleplayStarted || isTyping || isProcessingMessage) return;
    
    setIsProcessingMessage(true);
    
    const userMessage = roleplayResponse;
    
    setConversation(prev => [
      ...prev,
      { role: 'user', content: userMessage }
    ]);
    
    setRoleplayResponse('');
    
    await generateObjection(userMessage);
    
    setIsProcessingMessage(false);
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
      doc.text('AI Sales Trainer - Roleplay Session', 20, 20);
      doc.setFontSize(10);
      doc.text(`Engagement Level: ${prospectEngagement} | Challenge Level: ${challengeLevel}/5 | Phase: ${conversationPhase}`, 20, 30);
      doc.setFontSize(12);
      
      let yPosition = 45;
      conversation.forEach((message, index) => {
        const prefix = message.role === 'user' ? 'You: ' : `${persona} Prospect: `;
        const lines = doc.splitTextToSize(prefix + message.content, 170);
        
        doc.text(lines, 20, yPosition);
        yPosition += 10 * lines.length + 5;
        
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

  // Function to get engagement color
  const getEngagementColor = () => {
    switch(prospectEngagement) {
      case 'cold': return '#ff4444';
      case 'neutral': return '#ffaa00';
      case 'warm': return '#44aa44';
      case 'hot': return '#00aa44';
      default: return '#888888';
    }
  };

  return (
    <div style={{ 
      fontFamily: 'Nunito, sans-serif', 
      maxWidth: 1200, 
      margin: '0 auto', 
      padding: isMobile ? 15 : 40, 
      backgroundColor: '#f8f8ff', 
      borderRadius: 18 
    }}>
      <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.4rem', textAlign: 'center', marginBottom: 30 }}>AI Sales Trainer</h1>

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
        <div style={{ flex: 1, minWidth: isMobile ? '100%' : 220 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Feedback Tone:</label>
          <select value={coachTone} onChange={(e) => setCoachTone(e.target.value)} style={{ width: '100%', padding: 8 }}>
            {toneOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div style={{ flex: 1, minWidth: isMobile ? '100%' : 220 }}>
          <label style={{ fontWeight: 'bold', display: 'block', marginBottom: 6 }}>Who Are You Pitching To?</label>
          <select value={persona} onChange={(e) => setPersona(e.target.value)} style={{ width: '100%', padding: 8 }}>
            {personaOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, width: isMobile ? '100%' : 'auto' }}>
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

      {/* Engagement and Challenge Level Indicators */}
      {roleplay && roleplayStarted && (
        <div style={{ 
          display: 'flex', 
          gap: 20, 
          marginBottom: 20, 
          padding: 15, 
          backgroundColor: '#fff', 
          borderRadius: 8,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ flex: 1 }}>
            <strong>Prospect Engagement: </strong>
            <span style={{ color: getEngagementColor(), fontWeight: 'bold', textTransform: 'uppercase' }}>
              {prospectEngagement}
            </span>
          </div>
          <div style={{ flex: 1 }}>
            <strong>Challenge Level: </strong>
            <span style={{ fontWeight: 'bold' }}>{challengeLevel}/5</span>
          </div>
          <div style={{ flex: 1 }}>
            <strong>Phase: </strong>
            <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{conversationPhase}</span>
          </div>
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        flexDirection: isMobile || !roleplay ? 'column' : 'row',
        gap: 20, 
        width: '100%',
        alignItems: 'stretch'
      }}>
        {/* Left side - Original pitch and feedback section */}
        <div style={{ 
          flex: roleplay && !isMobile ? 1 : 'auto',
          width: '100%'
        }}>
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
              resize: 'vertical',
              boxSizing: 'border-box'
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

          <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: isMobile ? 'wrap' : 'nowrap' }}>
            <button 
              onClick={handleSubmit} 
              disabled={isLoading || !pitch.trim() || isProcessingMessage}
              style={{ flex: isMobile ? '1 0 auto' : 'none' }}
            >
              {isLoading ? 'Analyzing...' : (roleplay && !roleplayStarted) ? 'Start Roleplay' : 'Submit Pitch'}
            </button>
            <button 
              onClick={startVoice}
              style={{ flex: isMobile ? '1 0 auto' : 'none' }}
            >
              Use Voice
            </button>
            <button 
              onClick={exportToPDF} 
              disabled={!feedback && conversation.length === 0}
              style={{ flex: isMobile ? '1 0 auto' : 'none' }}
            >
              Download PDF
            </button>
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
          <div style={{ 
            flex: !isMobile ? 1 : 'auto',
            width: '100%'
          }}>
            <h3>Roleplay Conversation:</h3>
            <div style={{ 
              backgroundColor: '#f0f8ff', 
              borderRadius: 8, 
              padding: 16, 
              height: 400, 
              overflowY: 'auto',
              border: '1px solid #e1e4e8',
              marginBottom: 12,
              boxSizing: 'border-box'
            }}>
              {conversation.length > 0 ? (
                conversation.map((message, index) => (
                  <div key={index} style={{ 
                    marginBottom: 12,
                    backgroundColor: message.role === 'user' ? '#e3f2fd' : '#fff',
                    padding: 12,
                    borderRadius: 8,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    maxWidth: '90%',
                    marginLeft: message.role === 'user' ? 'auto' : '0',
                    border: message.role === 'prospect' && conversationPhase === 'ended' ? '2px solid #ff4444' : 'none'
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
                    "Enter your initial pitch in the main pitch area and click 'Start Roleplay' to begin the challenge" : 
                    "No conversation yet"}
                </div>
              )}
              {isTyping && (
                <div style={{ padding: 10, fontStyle: 'italic', color: '#666' }}>
                  Prospect is thinking...
                </div>
              )}
              {conversationPhase === 'ended' && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: 15, 
                  backgroundColor: '#ffebee', 
                  borderRadius: 8, 
                  marginTop: 10,
                  border: '1px solid #ffcdd2'
                }}>
                  <strong>Training Session Ended</strong><br/>
                  The prospect has made their decision. Review your performance and try again!
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
              <textarea
                value={roleplayResponse}
                onChange={(e) => setRoleplayResponse(e.target.value)}
                onKeyPress={handleRoleplayKeyPress}
                placeholder={
                  conversationPhase === 'ended' ? "Session ended - restart to try again" :
                  roleplayStarted ? "Type your response..." : 
                  "Start roleplay first to enable this input"
                }
                style={{ 
                  flex: 1, 
                  padding: 10, 
                  fontSize: 16, 
                  borderRadius: '8px 0 0 8px', 
                  resize: 'none',
                  minHeight: 60,
                  opacity: (roleplayStarted && conversationPhase !== 'ended') ? 1 : 0.7,
                  boxSizing: 'border-box'
                }}
                disabled={!roleplayStarted || isTyping || isProcessingMessage || conversationPhase === 'ended'}
              />
              <button 
                onClick={handleSendRoleplayResponse}
                disabled={isTyping || !roleplayResponse.trim() || !roleplayStarted || isProcessingMessage || conversationPhase === 'ended'}
                style={{ 
                  borderRadius: '0 8px 8px 0',
                  border: '1px solid #ccc',
                  borderLeft: 'none',
                  padding: '0 16px',
                  opacity: (roleplayStarted && roleplayResponse.trim() && !isTyping && !isProcessingMessage && conversationPhase !== 'ended') ? 1 : 0.7
                }}
              >
                Send
              </button>
            </div>
            
            {!roleplayStarted && roleplay && (
              <div style={{ marginTop: 8, fontSize: 13, color: '#666', textAlign: 'center' }}>
                Submit your initial pitch to start the challenging roleplay session
              </div>
            )}
            
            {roleplayStarted && conversationPhase !== 'ended' && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#666', textAlign: 'center' }}>
                💡 Tip: Be specific, provide evidence, and ask qualifying questions to improve engagement
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}