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
  
  // Enhanced adaptive states
  const [prospectEngagement, setProspectEngagement] = useState('neutral');
  const [challengeLevel, setChallengeLevel] = useState(1);
  const [conversationPhase, setConversationPhase] = useState('discovery');

  // ==================== PROMPT ENGINE - PERMANENT SOLUTION ====================
  
  // Comprehensive persona psychology definitions
  const getPersonaPsychology = (persona) => {
    const personas = {
      'new': {
        mindset: "Completely unfamiliar with the industry/product category",
        concerns: ["What is this?", "How does it work?", "Is this legitimate?", "What's the catch?"],
        behavior: "Ask basic questions, need simple explanations, easily confused by jargon",
        triggers: "Clear value proposition, simple benefits, social proof",
        challengeStyle: "Ask fundamental questions about the business/product basics"
      },
      'decision': {
        mindset: "Has authority to make purchasing decisions, focused on business impact",
        concerns: ["ROI and bottom line impact", "Implementation timeline", "Resource requirements", "Risk assessment"],
        behavior: "Direct, time-conscious, wants facts and figures, focused on outcomes",
        triggers: "Concrete ROI data, case studies, implementation plan, risk mitigation",
        challengeStyle: "Demand specific business metrics, question assumptions about impact"
      },
      'skeptical': {
        mindset: "Doubtful of claims, has been burned before, needs extensive proof",
        concerns: ["Is this too good to be true?", "Hidden costs", "Past bad experiences", "Vendor reliability"],
        behavior: "Challenges every claim, asks for proof, brings up potential problems",
        triggers: "Third-party validation, detailed references, transparent pricing",
        challengeStyle: "Question everything, demand proof for all claims, bring up potential failures"
      },
      'executive': {
        mindset: "Extremely time-conscious, strategic thinker, delegates details",
        concerns: ["Strategic fit", "High-level impact", "Executive summary", "Time investment"],
        behavior: "Wants executive summary, impatient with details, thinks strategically",
        triggers: "Strategic alignment, competitive advantage, executive-level benefits",
        challengeStyle: "Cut to the chase, demand strategic justification, show impatience with details"
      },
      'budget': {
        mindset: "Cost-conscious, needs to justify every expense, limited resources",
        concerns: ["Cost vs. benefit", "Budget constraints", "Cheaper alternatives", "Financial justification"],
        behavior: "Always asks about price, compares costs, looks for discounts",
        triggers: "Cost savings, ROI calculations, payment flexibility, value demonstration",
        challengeStyle: "Constantly question costs, compare to cheaper alternatives, demand cost justification"
      },
      'technical': {
        mindset: "Focused on specifications, integration, and technical feasibility",
        concerns: ["Technical specifications", "Integration complexity", "Technical support", "System requirements"],
        behavior: "Asks detailed technical questions, wants specifications, concerned about implementation",
        triggers: "Technical documentation, integration support, detailed specifications",
        challengeStyle: "Ask highly technical questions, challenge technical claims, question compatibility"
      },
      'emotional': {
        mindset: "Makes decisions based on feelings and personal connection",
        concerns: ["How it makes them feel", "Personal relationship", "Company culture fit", "Emotional appeal"],
        behavior: "Responds to stories, values relationships, influenced by emotional appeals",
        triggers: "Personal stories, emotional connection, relationship building",
        challengeStyle: "Focus on feelings and relationships, express emotional concerns"
      },
      'warm': {
        mindset: "Already interested but needs final convincing",
        concerns: ["Final details", "Implementation specifics", "Next steps", "Getting started"],
        behavior: "Positive but cautious, ready to move forward with right answers",
        triggers: "Implementation plan, next steps, getting started process",
        challengeStyle: "Ask about implementation details, timeline concerns, final objections"
      },
      'competitor': {
        mindset: "Potentially gathering competitive intelligence",
        concerns: ["How you compare to competitors", "Unique differentiators", "Pricing strategy", "Market position"],
        behavior: "Asks probing questions about competition, pricing, and strategy",
        triggers: "Competitive advantages, unique features, market positioning",
        challengeStyle: "Ask about competitors, challenge uniqueness claims, probe for strategic information"
      }
    };
    
    return personas[persona] || personas['new'];
  };

  // Advanced user input analysis
  const analyzeUserInput = (userMessage) => {
    const message = userMessage.toLowerCase();
    let analysis = {
      quality: 0,
      specificity: 0,
      valueProposition: 0,
      credibility: 0,
      engagement: 0,
      insights: []
    };
    
    // Quality indicators
    if (message.length > 50) analysis.quality += 2;
    if (message.includes('because') || message.includes('specifically')) analysis.quality += 3;
    if (message.includes('for example') || message.includes('such as')) analysis.quality += 2;
    if (message.includes('data') || message.includes('research') || message.includes('study')) analysis.quality += 2;
    
    // Specificity indicators
    if (message.includes('$') || message.includes('percent') || message.includes('%')) analysis.specificity += 3;
    if (message.includes('increase') || message.includes('decrease') || message.includes('improve')) analysis.specificity += 2;
    if (message.match(/\d+/)) analysis.specificity += 2; // Contains numbers
    if (message.includes('roi') || message.includes('return on investment')) analysis.specificity += 3;
    
    // Value proposition indicators
    if (message.includes('save') || message.includes('reduce cost')) analysis.valueProposition += 3;
    if (message.includes('increase revenue') || message.includes('grow sales')) analysis.valueProposition += 3;
    if (message.includes('efficiency') || message.includes('productivity')) analysis.valueProposition += 2;
    if (message.includes('competitive advantage')) analysis.valueProposition += 3;
    
    // Credibility indicators
    if (message.includes('proven') || message.includes('track record')) analysis.credibility += 2;
    if (message.includes('client') || message.includes('customer') || message.includes('case study')) analysis.credibility += 3;
    if (message.includes('reference') || message.includes('testimonial')) analysis.credibility += 2;
    if (message.includes('guarantee') || message.includes('warranty')) analysis.credibility += 2;
    
    // Engagement indicators
    if (message.includes('question') || message.includes('?')) analysis.engagement += 2;
    if (message.includes('you') || message.includes('your')) analysis.engagement += 1;
    if (message.includes('understand') || message.includes('clarify')) analysis.engagement += 2;
    
    // Negative indicators
    if (message.includes('good') || message.includes('great') || message.includes('amazing')) {
      analysis.quality -= 2;
      analysis.insights.push('Using generic adjectives instead of specific benefits');
    }
    if (message.includes('i think') || message.includes('maybe') || message.includes('probably')) {
      analysis.credibility -= 2;
      analysis.insights.push('Sounds uncertain and not confident');
    }
    if (message.length < 20) {
      analysis.quality -= 3;
      analysis.insights.push('Response too brief and lacks detail');
    }
    if (message.includes('um') || message.includes('uh') || message.includes('like')) {
      analysis.quality -= 1;
      analysis.insights.push('Contains filler words');
    }
    
    // Calculate overall score
    const totalScore = analysis.quality + analysis.specificity + analysis.valueProposition + analysis.credibility + analysis.engagement;
    analysis.overallScore = Math.max(0, Math.min(10, totalScore));
    
    return analysis;
  };

  // Dynamic conversation phase logic
  const determineConversationPhase = (messageCount, engagement, inputAnalysis) => {
    if (messageCount <= 2) return 'discovery';
    if (messageCount <= 4) return 'presentation';
    if (engagement === 'cold') return 'ended';
    if (engagement === 'hot' && messageCount > 6) return 'closing';
    if (messageCount > 4) return 'objection_handling';
    return 'presentation';
  };

  // Advanced engagement calculation
  const calculateNewEngagement = (currentEngagement, inputAnalysis, persona) => {
    const psychology = getPersonaPsychology(persona);
    let engagementScore = 0;
    
    // Base score from input analysis
    engagementScore += inputAnalysis.overallScore;
    
    // Persona-specific adjustments
    if (persona === 'skeptical') {
      // Skeptical prospects need extra credibility
      engagementScore += inputAnalysis.credibility * 2;
      engagementScore -= 2; // Harder to please
    } else if (persona === 'decision') {
      // Decision makers want ROI and specifics
      engagementScore += inputAnalysis.specificity * 2;
      engagementScore += inputAnalysis.valueProposition;
    } else if (persona === 'budget') {
      // Budget-conscious want cost savings
      engagementScore += inputAnalysis.valueProposition * 2;
    } else if (persona === 'technical') {
      // Technical want specifics and details
      engagementScore += inputAnalysis.specificity * 2;
    }
    
    // Determine new engagement level
    const engagementLevels = ['cold', 'neutral', 'warm', 'hot'];
    const currentIndex = engagementLevels.indexOf(currentEngagement);
    
    if (engagementScore >= 8) {
      return engagementLevels[Math.min(currentIndex + 1, 3)];
    } else if (engagementScore <= 3) {
      return engagementLevels[Math.max(currentIndex - 1, 0)];
    }
    
    return currentEngagement;
  };

  // Comprehensive system prompt generation
  const generateAdvancedSystemPrompt = (userMessage, conversationHistory) => {
    const inputAnalysis = analyzeUserInput(userMessage);
    const psychology = getPersonaPsychology(persona);
    const messageCount = conversationHistory.length;
    
    // Get conversation context
    const recentMessages = conversationHistory.slice(-4);
    const conversationSummary = recentMessages.map(msg => 
      `${msg.role === 'user' ? 'Salesperson' : 'Prospect'}: ${msg.content}`
    ).join('\n');
    
    // Determine response strategy based on input analysis
    let responseStrategy = '';
    if (inputAnalysis.overallScore >= 7) {
      responseStrategy = 'STRONG_RESPONSE: They gave a good answer. Acknowledge it but raise a new, more challenging concern.';
    } else if (inputAnalysis.overallScore >= 4) {
      responseStrategy = 'AVERAGE_RESPONSE: They gave an okay answer but lacking specifics. Push for more details and proof.';
    } else {
      responseStrategy = 'WEAK_RESPONSE: They gave a vague or poor answer. Challenge them directly and express skepticism.';
    }
    
    // Phase-specific instructions
    const phaseInstructions = {
      'discovery': 'Focus on understanding their offering and asking qualifying questions.',
      'presentation': 'Challenge their value proposition and ask for specific benefits.',
      'objection_handling': 'Present realistic concerns and objections that need to be addressed.',
      'closing': 'Focus on decision-making process, timeline, and next steps.',
      'ended': 'The conversation should end. Express that you\'ve heard enough and are not interested.'
    };
    
    return `You are an expert AI Sales Trainer roleplaying as a ${persona} prospect. Your mission is to help this salesperson improve by providing realistic, challenging interactions.

PROSPECT PSYCHOLOGY:
- Mindset: ${psychology.mindset}
- Primary Concerns: ${psychology.concerns.join(', ')}
- Behavioral Pattern: ${psychology.behavior}
- Challenge Style: ${psychology.challengeStyle}

CONVERSATION CONTEXT:
- Messages exchanged: ${messageCount}
- Current engagement: ${prospectEngagement}
- Challenge level: ${challengeLevel}/5
- Phase: ${conversationPhase}

RECENT CONVERSATION:
${conversationSummary}

INPUT ANALYSIS of their last message:
- Overall Quality: ${inputAnalysis.overallScore}/10
- Specificity: ${inputAnalysis.specificity}/10
- Value Proposition: ${inputAnalysis.valueProposition}/10
- Credibility: ${inputAnalysis.credibility}/10
${inputAnalysis.insights.length > 0 ? '- Issues: ' + inputAnalysis.insights.join(', ') : ''}

RESPONSE STRATEGY:
${responseStrategy}

PERSONA-SPECIFIC INSTRUCTIONS:
As a ${persona}, you should: ${psychology.challengeStyle}

PHASE INSTRUCTIONS:
${phaseInstructions[conversationPhase]}

CRITICAL RESPONSE RULES:
1. NEVER repeat previous responses - each response must be unique
2. Respond DIRECTLY to what they just said, not generic responses
3. Use the persona psychology to guide your specific concerns
4. Challenge them at level ${challengeLevel}/5 difficulty
5. If engagement is ${prospectEngagement}, adjust your tone accordingly
6. Keep responses 1-3 sentences unless ending the conversation
7. Be realistic - act like a real ${persona} would act

YOUR RESPONSE should directly address their last message while embodying the ${persona} psychology and current engagement level of ${prospectEngagement}.`;
  };

  // ==================== END PROMPT ENGINE ====================

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
      setIsFirstRoleplay(true);
      setRoleplayStarted(false);
      setConversation([]);
      setPitch('');
      setRoleplayResponse('');
      setProspectEngagement('neutral');
      setChallengeLevel(1);
      setConversationPhase('discovery');
    } else {
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

  // Enhanced engagement and challenge level updates
  const updateEngagementAndChallenge = (userMessage) => {
    const inputAnalysis = analyzeUserInput(userMessage);
    const newEngagement = calculateNewEngagement(prospectEngagement, inputAnalysis, persona);
    const newPhase = determineConversationPhase(conversation.length, newEngagement, inputAnalysis);
    
    setProspectEngagement(newEngagement);
    setConversationPhase(newPhase);
    
    // Update challenge level based on performance
    if (inputAnalysis.overallScore >= 7) {
      setChallengeLevel(prev => Math.min(prev + 1, 5));
    } else if (inputAnalysis.overallScore <= 3) {
      setChallengeLevel(prev => Math.max(prev - 1, 1));
    }
  };

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
      const psychology = getPersonaPsychology(persona);
      
      const systemPrompt = `You are an AI Sales Trainer roleplaying as a ${persona} prospect. This is their opening pitch.

PERSONA PSYCHOLOGY:
- Mindset: ${psychology.mindset}
- Primary Concerns: ${psychology.concerns.join(', ')}
- Behavior: ${psychology.behavior}

INSTRUCTIONS:
- Respond as a ${persona} would to this initial pitch
- Express a realistic concern or ask a challenging question
- Set the tone for a professional but challenging conversation
- Make them work to earn your interest
- Keep it 1-2 sentences

Respond with a realistic initial objection or question that a ${persona} would have.`;

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

  // MAIN OBJECTION GENERATION WITH ADVANCED PROMPT ENGINE
  const generateObjection = async (userMessage) => {
    if (!userMessage || !userMessage.trim() || isProcessingMessage) return;
    
    setIsTyping(true);
    setIsProcessingMessage(true);
    
    try {
      // Update engagement and challenge based on user input
      updateEngagementAndChallenge(userMessage);
      
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
      
      // Generate advanced system prompt using our prompt engine
      const systemPrompt = generateAdvancedSystemPrompt(userMessage, conversation);
      
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
      
      // Advanced anti-repetition system
      const recentResponses = conversation
        .filter(msg => msg.role === 'prospect')
        .slice(-5)
        .map(msg => msg.content.toLowerCase());
      
      // Check for similarity and force variation if needed
      const isTooSimilar = recentResponses.some(prev => {
        const similarity = prev.split(' ').filter(word => 
          newObjection.toLowerCase().includes(word) && word.length > 3
        ).length;
        return similarity > 3;
      });
      
      if (isTooSimilar) {
        const psychology = getPersonaPsychology(persona);
        const backupResponses = psychology.concerns.map(concern => 
          `${concern} Can you address this specifically?`
        );
        newObjection = backupResponses[Math.floor(Math.random() * backupResponses.length)];
      }
      
      setObjection(newObjection);
      setConversation(prev => [
        ...prev, 
        { role: 'prospect', content: newObjection }
      ]);
      
    } catch (err) {
      console.error("Error generating objection:", err);
      const psychology = getPersonaPsychology(persona);
      const fallbackMessage = psychology.concerns[0] + " Can you elaborate on that?";
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
      
      // Enhanced feedback system prompt
      const systemPrompt = `You are an expert AI sales coach with a ${coachTone} tone. Your goal is to help this person become a better salesperson through honest, constructive feedback.

Evaluate their sales pitch as if they were pitching to a ${persona}. Be critical and honest - this is training, not encouragement.

EVALUATION CRITERIA (Rate 0-10):
- Confidence: Do they sound sure of their value proposition?
- Clarity: Is their message clear and easy to understand?
- Structure: Is there a logical flow to their pitch?
- Authenticity: Does it sound genuine or scripted?
- Persuasiveness: Would this actually convince a ${persona} to take action?

COACHING FOCUS:
- Be tough on vague or generic statements
- Penalize lack of specific benefits or ROI
- Criticize missing value propositions
- Call out poor structure or rambling
- Highlight weak closes or missing call-to-action

FEEDBACK STYLE: ${coachTone === 'tough' ? 'Be direct and brutally honest' : coachTone === 'friendly' ? 'Be encouraging but honest' : 'Be professional and constructive'}

Return a JSON object with confidence, clarity, structure, authenticity, persuasiveness (rated 0-10), strongestLine, weakestLine, and detailed comments that will help them improve significantly.`;

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
      doc.text('AI Sales Trainer - Advanced Roleplay Session', 20, 20);
      doc.setFontSize(10);
      doc.text(`Engagement: ${prospectEngagement} | Challenge: ${challengeLevel}/5 | Phase: ${conversationPhase} | Persona: ${persona}`, 20, 30);
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
      doc.text('AI Sales Trainer - Pitch Feedback', 20, 20);
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
    
    doc.save(roleplay ? 'advanced-sales-roleplay.pdf' : 'sales-feedback.pdf');
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

 // Function to get phase description
 const getPhaseDescription = () => {
   switch(conversationPhase) {
     case 'discovery': return 'Learning about your offering';
     case 'presentation': return 'Evaluating your value proposition';
     case 'objection_handling': return 'Expressing concerns and objections';
     case 'closing': return 'Considering next steps';
     case 'ended': return 'Conversation concluded';
     default: return 'In conversation';
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
     <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.4rem', textAlign: 'center', marginBottom: 30 }}>
       AI Sales Trainer - Advanced Edition
     </h1>

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
           Enable Advanced Roleplay
         </label>
       </div>
     </div>

     {/* Advanced Training Dashboard */}
     {roleplay && roleplayStarted && (
       <div style={{ 
         display: 'grid',
         gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
         gap: 15, 
         marginBottom: 20, 
         padding: 20, 
         backgroundColor: '#fff', 
         borderRadius: 12,
         boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
         border: `3px solid ${getEngagementColor()}`
       }}>
         <div style={{ textAlign: 'center' }}>
           <div style={{ fontSize: '14px', color: '#666', marginBottom: 5 }}>Prospect Engagement</div>
           <div style={{ 
             fontSize: '20px',
             fontWeight: 'bold', 
             color: getEngagementColor(), 
             textTransform: 'uppercase',
             letterSpacing: '1px'
           }}>
             {prospectEngagement}
           </div>
           <div style={{ fontSize: '12px', color: '#888' }}>
             {prospectEngagement === 'cold' && '❄️ Losing interest'}
             {prospectEngagement === 'neutral' && '😐 Cautiously interested'}
             {prospectEngagement === 'warm' && '😊 Becoming interested'}
             {prospectEngagement === 'hot' && '🔥 Very interested'}
           </div>
         </div>
         
         <div style={{ textAlign: 'center' }}>
           <div style={{ fontSize: '14px', color: '#666', marginBottom: 5 }}>Challenge Level</div>
           <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
             {challengeLevel}/5
           </div>
           <div style={{ fontSize: '12px', color: '#888' }}>
             {'⭐'.repeat(challengeLevel)}{'☆'.repeat(5-challengeLevel)}
           </div>
         </div>
         
         <div style={{ textAlign: 'center' }}>
           <div style={{ fontSize: '14px', color: '#666', marginBottom: 5 }}>Current Phase</div>
           <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#333', textTransform: 'capitalize' }}>
             {conversationPhase.replace('_', ' ')}
           </div>
           <div style={{ fontSize: '12px', color: '#888' }}>
             {getPhaseDescription()}
           </div>
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
       {/* Left side - Pitch input and feedback */}
       <div style={{ 
         flex: roleplay && !isMobile ? 1 : 'auto',
         width: '100%'
       }}>
         <textarea
           value={pitch}
           onChange={(e) => setPitch(e.target.value)}
           placeholder={roleplay ? "Enter your initial pitch here to start the advanced training..." : "Your pitch here..."}
           rows={5}
           style={{ 
             width: '100%', 
             padding: 12, 
             fontSize: 16, 
             borderRadius: 8, 
             marginBottom: 20,
             resize: 'vertical',
             boxSizing: 'border-box',
             border: roleplay ? '2px solid #4CAF50' : '1px solid #ccc'
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
             style={{ 
               flex: isMobile ? '1 0 auto' : 'none',
               backgroundColor: roleplay && !roleplayStarted ? '#4CAF50' : '#007bff',
               color: 'white',
               padding: '10px 20px',
               border: 'none',
               borderRadius: '6px',
               fontSize: '14px',
               fontWeight: 'bold'
             }}
           >
             {isLoading ? 'Analyzing...' : (roleplay && !roleplayStarted) ? 'Start Advanced Training' : 'Get Feedback'}
           </button>
           <button 
             onClick={startVoice}
             style={{ flex: isMobile ? '1 0 auto' : 'none' }}
           >
             🎤 Voice
           </button>
           <button 
             onClick={exportToPDF} 
             disabled={!feedback && conversation.length === 0}
             style={{ flex: isMobile ? '1 0 auto' : 'none' }}
           >
             📄 Export
           </button>
         </div>

         {feedback && !roleplay && (
           <div style={{ marginTop: 20 }}>
             <h3>Detailed Feedback Analysis:</h3>
             <div style={{ 
               display: 'grid', 
               gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
               gap: 15,
               marginBottom: 20 
             }}>
               <div style={{ backgroundColor: '#f8f9fa', padding: 15, borderRadius: 8 }}>
                 <h4>Performance Scores</h4>
                 <ul style={{ margin: 0, paddingLeft: 20 }}>
                   <li><strong>Confidence:</strong> {feedback.confidence}/10</li>
                   <li><strong>Clarity:</strong> {feedback.clarity}/10</li>
                   <li><strong>Structure:</strong> {feedback.structure}/10</li>
                   <li><strong>Authenticity:</strong> {feedback.authenticity}/10</li>
                   <li><strong>Persuasiveness:</strong> {feedback.persuasiveness}/10</li>
                 </ul>
               </div>
               
               <div style={{ backgroundColor: '#f8f9fa', padding: 15, borderRadius: 8 }}>
                 <h4>Key Insights</h4>
                 <p><strong>Strongest Line:</strong> {feedback.strongestLine || 'Not identified'}</p>
                 <p><strong>Weakest Line:</strong> {feedback.weakestLine || 'Not identified'}</p>
               </div>
             </div>
             
             <div style={{ backgroundColor: '#fff', padding: 20, borderRadius: 8, boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
               <h4>Coach Comments:</h4>
               <p style={{ lineHeight: 1.6 }}>{feedback.comments || 'No detailed comments provided.'}</p>
             </div>

             <div style={{ height: 300, marginTop: 30 }}>
               <ResponsiveContainer>
                 <RadarChart data={radarData}>
                   <PolarGrid />
                   <PolarAngleAxis dataKey="subject" />
                   <PolarRadiusAxis angle={30} domain={[0, 10]} />
                   <Radar name="Your Score" dataKey="A" stroke="#4CAF50" fill="#4CAF50" fillOpacity={0.6} />
                   <Tooltip />
                 </RadarChart>
               </ResponsiveContainer>
             </div>
           </div>
         )}
       </div>

       {/* Right side - Advanced Roleplay Conversation */}
       {roleplay && (
         <div style={{ 
           flex: !isMobile ? 1 : 'auto',
           width: '100%'
         }}>
           <h3 style={{ marginBottom: 10 }}>
             Advanced Training Session
             {roleplayStarted && (
               <span style={{ fontSize: '14px', color: '#666', fontWeight: 'normal', marginLeft: 10 }}>
                 vs {personaOptions.find(p => p.value === persona)?.label}
               </span>
             )}
           </h3>
           
           <div style={{ 
             backgroundColor: '#f0f8ff', 
             borderRadius: 12, 
             padding: 20, 
             height: 450, 
             overflowY: 'auto',
             border: roleplayStarted ? `2px solid ${getEngagementColor()}` : '1px solid #e1e4e8',
             marginBottom: 15,
             boxSizing: 'border-box'
           }}>
             {conversation.length > 0 ? (
               conversation.map((message, index) => (
                 <div key={index} style={{ 
                   marginBottom: 15,
                   backgroundColor: message.role === 'user' ? '#e3f2fd' : '#fff',
                   padding: 15,
                   borderRadius: 10,
                   boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                   maxWidth: '85%',
                   marginLeft: message.role === 'user' ? 'auto' : '0',
                   border: message.role === 'prospect' && conversationPhase === 'ended' ? '2px solid #ff4444' : 'none'
                 }}>
                   <div style={{ 
                     fontWeight: 'bold', 
                     marginBottom: 8,
                     color: message.role === 'user' ? '#1976d2' : '#d32f2f',
                     fontSize: '14px'
                   }}>
                     {message.role === 'user' ? 'You (Salesperson)' : `${personaOptions.find(p => p.value === persona)?.label} Prospect`}
                   </div>
                   <div style={{ lineHeight: 1.5 }}>{message.content}</div>
                 </div>
               ))
             ) : (
               <div style={{ 
                 textAlign: 'center', 
                 color: '#666', 
                 padding: 40,
                 backgroundColor: '#f8f9fa',
                 borderRadius: 8,
                 border: '2px dashed #ddd'
               }}>
                 <div style={{ fontSize: '48px', marginBottom: 15 }}>🎯</div>
                 <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: 10 }}>
                   Advanced Sales Training Ready
                 </div>
                 <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
                   Enter your pitch above and start training with our advanced AI that adapts to your performance.
                   <br/>Each persona has unique psychology and will challenge you differently!
                 </div>
               </div>
             )}
             
             {isTyping && (
               <div style={{ 
                 padding: 15, 
                 fontStyle: 'italic', 
                 color: '#666',
                 backgroundColor: '#fff3cd',
                 borderRadius: 8,
                 marginTop: 10
               }}>
                 <span style={{ marginRight: 10 }}>🤔</span>
                 {personaOptions.find(p => p.value === persona)?.label} is thinking of a challenging response...
               </div>
             )}
             
             {conversationPhase === 'ended' && (
               <div style={{ 
                 textAlign: 'center', 
                 padding: 20, 
                 backgroundColor: '#ffebee', 
                 borderRadius: 10, 
                 marginTop: 15,
                 border: '2px solid #ffcdd2'
               }}>
                 <div style={{ fontSize: '24px', marginBottom: 10 }}>🏁</div>
                 <strong>Training Session Complete</strong>
                 <div style={{ marginTop: 10, fontSize: '14px', color: '#666' }}>
                   The prospect has made their decision. Review the conversation and try again with a different approach!
                 </div>
               </div>
             )}
           </div>

           <div style={{ display: 'flex', alignItems: 'stretch', width: '100%' }}>
             <textarea
               value={roleplayResponse}
               onChange={(e) => setRoleplayResponse(e.target.value)}
               onKeyPress={handleRoleplayKeyPress}
               placeholder={
                 conversationPhase === 'ended' ? "Session ended - toggle roleplay off/on to restart" :
                 roleplayStarted ? "Type your response to continue the training..." : 
                 "Start training session first"
               }
               style={{ 
                 flex: 1, 
                 padding: 12, 
                 fontSize: 16, 
                 borderRadius: '8px 0 0 8px', 
                 resize: 'none',
                 minHeight: 70,
                 opacity: (roleplayStarted && conversationPhase !== 'ended') ? 1 : 0.7,
                 boxSizing: 'border-box',
                 border: '2px solid #ddd'
               }}
               disabled={!roleplayStarted || isTyping || isProcessingMessage || conversationPhase === 'ended'}
             />
             <button 
               onClick={handleSendRoleplayResponse}
               disabled={isTyping || !roleplayResponse.trim() || !roleplayStarted || isProcessingMessage || conversationPhase === 'ended'}
               style={{ 
                 borderRadius: '0 8px 8px 0',
                 border: '2px solid #4CAF50',
                 borderLeft: 'none',
                 padding: '0 20px',
                 backgroundColor: '#4CAF50',
                 color: 'white',
                 fontWeight: 'bold',
                 opacity: (roleplayStarted && roleplayResponse.trim() && !isTyping && !isProcessingMessage && conversationPhase !== 'ended') ? 1 : 0.7
               }}
             >
               Send
             </button>
           </div>
           
           {!roleplayStarted && roleplay && (
             <div style={{ 
               marginTop: 12, 
               fontSize: 13, 
               color: '#666', 
               textAlign: 'center',
               backgroundColor: '#e8f5e8',
               padding: 10,
               borderRadius: 6
             }}>
               💡 Submit your initial pitch above to begin advanced training session
             </div>
           )}
           
           {roleplayStarted && conversationPhase !== 'ended' && (
             <div style={{ 
               marginTop: 12, 
               fontSize: 12, 
               color: '#666', 
               textAlign: 'center',
               backgroundColor: '#fff3cd',
               padding: 8,
               borderRadius: 6
             }}>
               🎯 <strong>Training Tip:</strong> Be specific, provide evidence, and ask qualifying questions to improve engagement
             </div>
           )}
         </div>
       )}
     </div>
   </div>
 );
}