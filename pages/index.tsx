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
  const [trainingReport, setTrainingReport] = useState(null);

  // ==================== ENHANCED PROMPT ENGINE - FIXED VERSION ====================
  
  // Comprehensive persona psychology definitions
  const getPersonaPsychology = (persona) => {
    const personas = {
      'new': {
        mindset: "Completely unfamiliar with the industry/product category",
        concerns: ["What is this exactly?", "How does it work?", "Is this legitimate?", "What's the catch?", "Why should I care?"],
        behavior: "Ask basic questions, need simple explanations, easily confused by jargon",
        triggers: "Clear value proposition, simple benefits, social proof",
        challengeStyle: "Ask fundamental questions about the business/product basics",
        responses: [
          "I don't understand what you're selling exactly.",
          "This sounds too technical for me.",
          "How is this different from what I already have?",
          "Why would I need this?",
          "Can you explain this in simpler terms?",
          "What exactly does your course teach?",
          "I'm not familiar with this industry.",
          "How do I know this actually works?",
          "This seems complicated for someone like me."
        ]
      },
      'decision': {
        mindset: "Has authority to make purchasing decisions, focused on business impact",
        concerns: ["ROI and bottom line impact", "Implementation timeline", "Resource requirements", "Risk assessment", "Strategic fit"],
        behavior: "Direct, time-conscious, wants facts and figures, focused on outcomes",
        triggers: "Concrete ROI data, case studies, implementation plan, risk mitigation",
        challengeStyle: "Demand specific business metrics, question assumptions about impact",
        responses: [
          "What's the ROI on this investment?",
          "How long until we see results?",
          "What resources will this require from my team?",
          "How do you measure success?",
          "What are the risks if this doesn't work?",
          "Show me the business case.",
          "What's the implementation timeline?",
          "How does this impact our bottom line?",
          "What guarantees do you offer?"
        ]
      },
      'skeptical': {
        mindset: "Doubtful of claims, has been burned before, needs extensive proof",
        concerns: ["Is this too good to be true?", "Hidden costs", "Past bad experiences", "Vendor reliability", "Proof of claims"],
        behavior: "Challenges every claim, asks for proof, brings up potential problems",
        triggers: "Third-party validation, detailed references, transparent pricing",
        challengeStyle: "Question everything, demand proof for all claims, bring up potential failures",
        responses: [
          "I've heard promises like this before. What proof do you have?",
          "What are the hidden costs you're not telling me about?",
          "Can you provide references from similar companies?",
          "What happens if this doesn't deliver what you promise?",
          "How do I know you won't disappear after I pay?",
          "This sounds too good to be true.",
          "I've been burned by vendors before.",
          "Show me independent third-party validation.",
          "What's the catch here?"
        ]
      },
      'executive': {
        mindset: "Extremely time-conscious, strategic thinker, delegates details",
        concerns: ["Strategic fit", "High-level impact", "Executive summary", "Time investment", "Competitive advantage"],
        behavior: "Wants executive summary, impatient with details, thinks strategically",
        triggers: "Strategic alignment, competitive advantage, executive-level benefits",
        challengeStyle: "Cut to the chase, demand strategic justification, show impatience with details",
        responses: [
          "I only have 5 minutes. What's the bottom line?",
          "How does this align with our strategic objectives?",
          "What competitive advantage does this give us?",
          "I don't need details. What's the strategic impact?",
          "Who else in my industry is using this successfully?",
          "Cut to the chase - what's the value proposition?",
          "This needs to be a strategic decision.",
          "What's the executive summary here?",
          "How does this fit our long-term vision?"
        ]
      },
      'budget': {
        mindset: "Cost-conscious, needs to justify every expense, limited resources",
        concerns: ["Cost vs. benefit", "Budget constraints", "Cheaper alternatives", "Financial justification", "Payment terms"],
        behavior: "Always asks about price, compares costs, looks for discounts",
        triggers: "Cost savings, ROI calculations, payment flexibility, value demonstration",
        challengeStyle: "Constantly question costs, compare to cheaper alternatives, demand cost justification",
        responses: [
          "This sounds expensive. What are cheaper alternatives?",
          "How much will this actually cost all-in?",
          "Can you show me the cost-benefit analysis?",
          "What payment options do you offer?",
          "How do I justify this expense to my boss?",
          "We have a tight budget this year.",
          "What's the cheapest option available?",
          "Can you match competitor pricing?",
          "We need to see clear cost savings."
        ]
      },
      'technical': {
        mindset: "Focused on specifications, integration, and technical feasibility",
        concerns: ["Technical specifications", "Integration complexity", "Technical support", "System requirements", "Security"],
        behavior: "Asks detailed technical questions, wants specifications, concerned about implementation",
        triggers: "Technical documentation, integration support, detailed specifications",
        challengeStyle: "Ask highly technical questions, challenge technical claims, question compatibility",
        responses: [
          "What are the technical specifications?",
          "How does this integrate with our existing systems?",
          "What kind of technical support do you provide?",
          "What are the security implications?",
          "Can you provide detailed technical documentation?",
          "What's the technical architecture?",
          "How do you handle data migration?",
          "What about system compatibility?",
          "What are the technical requirements?"
        ]
      },
      'emotional': {
        mindset: "Makes decisions based on feelings and personal connection",
        concerns: ["How it makes them feel", "Personal relationship", "Company culture fit", "Emotional appeal", "Trust"],
        behavior: "Responds to stories, values relationships, influenced by emotional appeals",
        triggers: "Personal stories, emotional connection, relationship building",
        challengeStyle: "Focus on feelings and relationships, express emotional concerns",
        responses: [
          "I need to feel confident about this decision.",
          "How do I know I can trust you?",
          "This feels like a big risk for our company.",
          "What if my team doesn't like this change?",
          "Can you tell me about other clients' experiences?",
          "I'm worried about how this will affect our culture.",
          "This doesn't feel right for us.",
          "I need to trust the person I'm working with.",
          "How will this make our employees feel?"
        ]
      },
      'warm': {
        mindset: "Already interested but needs final convincing",
        concerns: ["Final details", "Implementation specifics", "Next steps", "Getting started", "Timeline"],
        behavior: "Positive but cautious, ready to move forward with right answers",
        triggers: "Implementation plan, next steps, getting started process",
        challengeStyle: "Ask about implementation details, timeline concerns, final objections",
        responses: [
          "This looks promising. What are the next steps?",
          "How quickly can we get started?",
          "What does the implementation process look like?",
          "What support do you provide during rollout?",
          "Can we do a pilot program first?",
          "I'm interested but need to see the details.",
          "What's the onboarding process?",
          "How long does implementation take?",
          "What kind of support do we get?"
        ]
      },
      'competitor': {
        mindset: "Potentially gathering competitive intelligence",
        concerns: ["How you compare to competitors", "Unique differentiators", "Pricing strategy", "Market position", "Features"],
        behavior: "Asks probing questions about competition, pricing, and strategy",
        triggers: "Competitive advantages, unique features, market positioning",
        challengeStyle: "Ask about competitors, challenge uniqueness claims, probe for strategic information",
        responses: [
          "How do you compare to [competitor name]?",
          "What makes you different from the competition?",
          "Your competitor offers this for less. Why should I pay more?",
          "What's your unique selling proposition?",
          "Who are your main competitors?",
          "How do you differentiate yourself?",
          "What advantages do you have over others?",
          "I'm evaluating multiple vendors.",
          "Why should I choose you over the competition?"
        ]
      }
    };
    
    return personas[persona] || personas['new'];
  };

  // Advanced user input analysis with detailed scoring
  const analyzeUserInput = (userMessage) => {
    const message = userMessage.toLowerCase();
    let analysis = {
      quality: 0,
      specificity: 0,
      valueProposition: 0,
      credibility: 0,
      engagement: 0,
      insights: [],
      overallScore: 0
    };
    
    // Quality indicators (detailed responses, proper structure)
    if (message.length > 50) analysis.quality += 2;
    if (message.length > 100) analysis.quality += 1;
    if (message.includes('because') || message.includes('specifically')) analysis.quality += 3;
    if (message.includes('for example') || message.includes('such as')) analysis.quality += 2;
    if (message.includes('let me explain') || message.includes('what i mean is')) analysis.quality += 2;
    
    // Specificity indicators (numbers, data, concrete examples)
    if (message.includes('$') || message.includes('percent') || message.includes('%')) analysis.specificity += 3;
    if (message.match(/\d+/)) analysis.specificity += 2; // Contains numbers
    if (message.includes('increase') || message.includes('decrease') || message.includes('improve')) analysis.specificity += 2;
    if (message.includes('roi') || message.includes('return on investment')) analysis.specificity += 3;
    if (message.includes('case study') || message.includes('example') || message.includes('client')) analysis.specificity += 2;
    
    // Value proposition indicators (clear benefits)
    if (message.includes('save') || message.includes('reduce cost')) analysis.valueProposition += 3;
    if (message.includes('increase revenue') || message.includes('grow sales')) analysis.valueProposition += 3;
    if (message.includes('efficiency') || message.includes('productivity')) analysis.valueProposition += 2;
    if (message.includes('competitive advantage') || message.includes('market leader')) analysis.valueProposition += 3;
    if (message.includes('problem') && message.includes('solution')) analysis.valueProposition += 2;
    
    // Credibility indicators (proof, evidence, track record)
    if (message.includes('proven') || message.includes('track record')) analysis.credibility += 2;
    if (message.includes('testimonial') || message.includes('reference')) analysis.credibility += 2;
    if (message.includes('guarantee') || message.includes('warranty')) analysis.credibility += 2;
    if (message.includes('certified') || message.includes('award')) analysis.credibility += 2;
    if (message.includes('years of experience') || message.includes('established')) analysis.credibility += 1;
    
    // Engagement indicators (questions, personalization)
    if (message.includes('?')) analysis.engagement += 2;
    if (message.includes('you') || message.includes('your')) analysis.engagement += 1;
    if (message.includes('understand') || message.includes('clarify')) analysis.engagement += 2;
    if (message.includes('what if') || message.includes('imagine')) analysis.engagement += 2;
    
    // Negative indicators - VERY harsh penalties for poor responses
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
    
    // EXTREMELY harsh penalties for terrible responses
    if (message === 'no' || message === 'yes' || message.length < 5) {
      analysis.quality -= 10;
      analysis.insights.push('Extremely brief response shows lack of engagement');
    }
    if (message.includes('tell me what you') || message.includes('what would you like')) {
      analysis.quality -= 3;
      analysis.insights.push('Deflecting instead of providing value');
    }
    
    // Calculate overall score (0-10 scale)
    const totalScore = analysis.quality + analysis.specificity + analysis.valueProposition + analysis.credibility + analysis.engagement;
    analysis.overallScore = Math.max(0, Math.min(10, totalScore));
    
    return analysis;
  };

  // Enhanced conversation phase logic
  const determineConversationPhase = (messageCount, engagement, inputAnalysis) => {
    if (messageCount <= 2) return 'discovery';
    if (engagement === 'cold' && messageCount > 3) return 'ended';
    if (engagement === 'hot' && messageCount > 6) return 'closing';
    if (messageCount <= 4) return 'presentation';
    if (messageCount > 4) return 'objection_handling';
    return 'presentation';
  };

  // Advanced engagement calculation with persona-specific logic
  const calculateNewEngagement = (currentEngagement, inputAnalysis, persona) => {
    const psychology = getPersonaPsychology(persona);
    let engagementScore = inputAnalysis.overallScore;
    
    // Persona-specific adjustments
    switch(persona) {
      case 'skeptical':
        engagementScore += inputAnalysis.credibility * 2;
        engagementScore -= 1; // Harder to please
        break;
      case 'decision':
        engagementScore += inputAnalysis.specificity * 1.5;
        engagementScore += inputAnalysis.valueProposition * 1.5;
        break;
      case 'budget':
        engagementScore += inputAnalysis.valueProposition * 2;
        break;
      case 'technical':
        engagementScore += inputAnalysis.specificity * 2;
        break;
      case 'executive':
        engagementScore += inputAnalysis.valueProposition * 1.5;
        if (inputAnalysis.quality < 5) engagementScore -= 2; // Impatient with poor responses
        break;
      case 'emotional':
        engagementScore += inputAnalysis.engagement * 1.5;
        break;
    }
    
    // Determine new engagement level
    const engagementLevels = ['cold', 'neutral', 'warm', 'hot'];
    const currentIndex = engagementLevels.indexOf(currentEngagement);
    
    if (engagementScore >= 8) {
      return engagementLevels[Math.min(currentIndex + 1, 3)];
    } else if (engagementScore <= 2) {
      return engagementLevels[Math.max(currentIndex - 1, 0)];
    }
    
    return currentEngagement;
  };

  // Training report generation
  const generateTrainingReport = () => {
    const userMessages = conversation.filter(msg => msg.role === 'user');
    const inputAnalyses = userMessages.map(msg => analyzeUserInput(msg.content));
    
    const avgQuality = inputAnalyses.length > 0 ? 
      inputAnalyses.reduce((sum, analysis) => sum + analysis.overallScore, 0) / inputAnalyses.length : 0;
    
    const report = {
      sessionLength: conversation.length,
      finalEngagement: prospectEngagement,
      maxChallengeLevel: challengeLevel,
      averageResponseQuality: Math.round(avgQuality * 10) / 10,
      strengths: [],
      weaknesses: [],
      recommendations: [],
      detailedAnalysis: inputAnalyses
    };
    
    // Analyze strengths
    if (avgQuality >= 6) report.strengths.push("Good overall response quality and detail");
    if (inputAnalyses.some(a => a.specificity >= 5)) report.strengths.push("Provided specific examples and data");
    if (inputAnalyses.some(a => a.credibility >= 4)) report.strengths.push("Used credible evidence and proof points");
    if (inputAnalyses.some(a => a.valueProposition >= 5)) report.strengths.push("Clearly articulated value proposition");
    if (inputAnalyses.some(a => a.engagement >= 4)) report.strengths.push("Engaged well with prospect questions");
    if (prospectEngagement === 'warm' || prospectEngagement === 'hot') report.strengths.push("Successfully built prospect interest");
    
    // Analyze weaknesses
    if (avgQuality < 4) {
      report.weaknesses.push("Responses were too vague or generic");
      report.recommendations.push("Be more specific with examples, data, and concrete benefits");
    }
    if (prospectEngagement === 'cold') {
      report.weaknesses.push("Failed to maintain prospect interest");
      report.recommendations.push("Focus on understanding prospect needs and demonstrating clear value");
    }
    if (challengeLevel < 3) {
      report.weaknesses.push("Struggled with basic objections and questions");
      report.recommendations.push("Practice handling common objections with specific, credible responses");
    }
    if (inputAnalyses.some(a => a.credibility < 2)) {
      report.weaknesses.push("Lacked credible proof and evidence");
      report.recommendations.push("Include case studies, testimonials, and concrete proof points");
    }
    if (conversation.length < 6) {
      report.weaknesses.push("Conversation ended too quickly");
      report.recommendations.push("Work on building rapport and addressing concerns more thoroughly");
    }
    
    // Persona-specific recommendations
    const psychology = getPersonaPsychology(persona);
    report.recommendations.push(`When selling to ${persona} prospects: ${psychology.challengeStyle.toLowerCase()}`);
    
    setTrainingReport(report);
  };

  // ==================== END ENHANCED PROMPT ENGINE ====================

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

  // Modified roleplay effect to reset all states
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
      setTrainingReport(null);
    } else {
      setObjection('');
      setConversation([]);
      setRoleplayStarted(false);
      setRoleplayResponse('');
      setProspectEngagement('neutral');
      setChallengeLevel(1);
      setConversationPhase('discovery');
      setTrainingReport(null);
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
    } else if (inputAnalysis.overallScore <= 2) {
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

PERSONA: ${persona} - ${psychology.mindset}
TYPICAL CONCERNS: ${psychology.concerns.join(', ')}
BEHAVIOR: ${psychology.behavior}

INSTRUCTIONS:
- Respond as a ${persona} would to this initial pitch
- Express one of your typical concerns or ask a challenging question
- Set a professional but challenging tone
- Make them work to earn your interest
- Use 1-2 sentences maximum

Generate a realistic initial response that a ${persona} would give to this pitch:
"${userPitch}"`;

      console.log('Initial prompt:', systemPrompt);

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

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Initial API Response:', data);
      
      // Enhanced response extraction with immediate fallback to persona responses
      let newObjection = '';
      if (typeof data === 'string') {
        newObjection = data.trim();
      } else if (data.content) {
        newObjection = data.content.trim();
      } else if (data.choices && data.choices[0] && data.choices[0].message) {
        newObjection = data.choices[0].message.content.trim();
      } else {
        // Fallback to persona-specific response immediately
        const psychology = getPersonaPsychology(persona);
        newObjection = psychology.responses[0];
        console.log('Using fallback persona response:', newObjection);
      }
      
      // FORCE persona response if it contains the problematic phrase
      if (newObjection.toLowerCase().includes('i need more specific information')) {
        const psychology = getPersonaPsychology(persona);
        newObjection = psychology.responses[Math.floor(Math.random() * psychology.responses.length)];
        console.log('Forced persona response due to repetitive content:', newObjection);
      }
      
      setObjection(newObjection);
      setConversation(prev => [
        ...prev,
        { role: 'prospect', content: newObjection }
      ]);
    } catch (err) {
      console.error("Error generating initial objection:", err);
      const psychology = getPersonaPsychology(persona);
      const fallbackMessage = psychology.responses[0];
      console.log('Using error fallback response:', fallbackMessage);
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

  // MAIN FIXED OBJECTION GENERATION FUNCTION WITH DEBUGGING
  const generateObjection = async (userMessage) => {
    if (!userMessage || !userMessage.trim() || isProcessingMessage) return;
    
    setIsTyping(true);
    setIsProcessingMessage(true);
    
    try {
      // Analyze user input first
      const inputAnalysis = analyzeUserInput(userMessage);
      console.log('User input analysis:', inputAnalysis);
      
      // Update engagement and challenge based on user input
      updateEngagementAndChallenge(userMessage);
      
      const psychology = getPersonaPsychology(persona);
      console.log('Persona psychology:', psychology);
      
      // IMMEDIATELY use persona responses for poor quality inputs
      if (inputAnalysis.overallScore <= 3) {
        console.log('Poor input detected, using persona response immediately');
        const poorResponseReactions = [
          `${psychology.responses[0]}`,
          `${psychology.responses[1]}`,
          `That's not helpful. ${psychology.concerns[0]}?`,
          `I'm not getting useful information. ${psychology.concerns[1]}?`,
          `You're not answering my questions properly.`
        ];
        const immediateResponse = poorResponseReactions[Math.floor(Math.random() * poorResponseReactions.length)];
        
        setObjection(immediateResponse);
        setConversation(prev => [
          ...prev, 
          { role: 'prospect', content: immediateResponse }
        ]);
        
        if (conversationPhase === 'ended') {
          setTimeout(() => generateTrainingReport(), 500);
        }
        
        setIsTyping(false);
        setIsProcessingMessage(false);
        return;
      }
      
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
      
      // Enhanced system prompt
      const systemPrompt = `You are an AI Sales Trainer roleplaying as a ${persona} prospect.

PERSONA PROFILE:
- Type: ${persona}
- Mindset: ${psychology.mindset}
- Typical Concerns: ${psychology.concerns.join(', ')}
- Behavior: ${psychology.behavior}

USER'S RESPONSE QUALITY: ${inputAnalysis.overallScore}/10
ENGAGEMENT LEVEL: ${prospectEngagement}
CONVERSATION PHASE: ${conversationPhase}

CRITICAL INSTRUCTIONS:
1. You are a ${persona} - respond with their typical concerns and language
2. NEVER use the phrase "I need more specific information about how this would work for my situation"
3. React to what they actually said, not generic responses
4. Use the persona's typical language and concerns
5. If they gave a poor response, be challenging like a real ${persona} would be
6. Keep responses 1-2 sentences

RESPOND AS A REAL ${persona} WOULD TO: "${userMessage}"`;

      console.log('Sending system prompt:', systemPrompt);
      
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

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Raw API response:', data);
      
      // Enhanced response extraction with forced persona fallbacks
      let newObjection = '';
      if (typeof data === 'string') {
        newObjection = data.trim();
      } else if (data.content) {
        newObjection = data.content.trim();
      } else if (data.choices && data.choices[0] && data.choices[0].message) {
        newObjection = data.choices[0].message.content.trim();
      } else if (data.message) {
        newObjection = data.message.trim();
      } else {
        console.error('Unexpected API response format:', data);
       throw new Error('Invalid API response format');
     }
     
     console.log('Extracted response:', newObjection);
     
     // FORCE persona responses for problematic content
     if (newObjection.toLowerCase().includes('i need more specific information') || 
         newObjection.toLowerCase().includes('how this would work for my situation') ||
         newObjection.length < 10) {
       console.log('Forcing persona response due to problematic content or too short');
       newObjection = psychology.responses[Math.floor(Math.random() * psychology.responses.length)];
       console.log('Using forced persona response:', newObjection);
     }
     
     // Enhanced anti-repetition system
     const recentResponses = conversation
       .filter(msg => msg.role === 'prospect')
       .slice(-3)
       .map(msg => msg.content.toLowerCase());
     
     // Check for repetition more thoroughly
     const isRepeated = recentResponses.some(prev => {
       const prevWords = prev.split(' ').filter(word => word.length > 3);
       const newWords = newObjection.toLowerCase().split(' ').filter(word => word.length > 3);
       const matchingWords = prevWords.filter(word => newWords.includes(word)).length;
       return matchingWords > 3;
     });
     
     if (isRepeated) {
       console.log('Response detected as repetitive, using fresh persona response');
       // Use a completely different persona response
       const availableResponses = psychology.responses.filter(resp => 
         !recentResponses.some(recent => recent.includes(resp.toLowerCase().substring(0, 10)))
       );
       newObjection = availableResponses.length > 0 ? 
         availableResponses[Math.floor(Math.random() * availableResponses.length)] :
         psychology.responses[Math.floor(Math.random() * psychology.responses.length)];
       console.log('Using anti-repetition response:', newObjection);
     }
     
     // Generate training report if conversation ended
     if (conversationPhase === 'ended') {
       setTimeout(() => generateTrainingReport(), 500);
     }
     
     setObjection(newObjection);
     setConversation(prev => [
       ...prev, 
       { role: 'prospect', content: newObjection }
     ]);
     
   } catch (err) {
     console.error("Error generating objection:", err);
     
     // Robust fallback system using persona responses
     const psychology = getPersonaPsychology(persona);
     const inputAnalysis = analyzeUserInput(userMessage);
     
     let fallbackMessage;
     if (inputAnalysis.overallScore < 3) {
       // Poor response gets challenging persona response
       fallbackMessage = psychology.responses[Math.floor(Math.random() * Math.min(3, psychology.responses.length))];
     } else {
       // Better response gets more constructive persona response
       fallbackMessage = psychology.responses[Math.floor(Math.random() * psychology.responses.length)];
     }
     
     console.log('Using error fallback response:', fallbackMessage);
     
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
   if (!feedback && conversation.length === 0 && !trainingReport) return;
   
   const doc = new jsPDF();
   doc.setFont('helvetica');
   doc.setFontSize(16);
   
   if (roleplay && (conversation.length > 0 || trainingReport)) {
     doc.text('AI Sales Trainer - Professional Training Report', 20, 20);
     doc.setFontSize(10);
     doc.text(`Persona: ${persona} | Final Engagement: ${prospectEngagement} | Challenge Level: ${challengeLevel}/5`, 20, 30);
     doc.setFontSize(12);
     
     if (trainingReport) {
       let yPosition = 45;
       doc.text('TRAINING SUMMARY:', 20, yPosition);
       yPosition += 15;
       doc.text(`Session Length: ${trainingReport.sessionLength} messages`, 20, yPosition);
       yPosition += 10;
       doc.text(`Average Response Quality: ${trainingReport.averageResponseQuality}/10`, 20, yPosition);
       yPosition += 10;
       doc.text(`Final Engagement: ${trainingReport.finalEngagement.toUpperCase()}`, 20, yPosition);
       yPosition += 15;
       
       if (trainingReport.strengths.length > 0) {
         doc.text('STRENGTHS:', 20, yPosition);
         yPosition += 10;
         trainingReport.strengths.forEach(strength => {
           const lines = doc.splitTextToSize(`• ${strength}`, 170);
           doc.text(lines, 25, yPosition);
           yPosition += 8 * lines.length;
         });
         yPosition += 5;
       }
       
       if (trainingReport.weaknesses.length > 0) {
         doc.text('AREAS FOR IMPROVEMENT:', 20, yPosition);
         yPosition += 10;
         trainingReport.weaknesses.forEach(weakness => {
           const lines = doc.splitTextToSize(`• ${weakness}`, 170);
           doc.text(lines, 25, yPosition);
           yPosition += 8 * lines.length;
         });
         yPosition += 5;
       }
       
       if (trainingReport.recommendations.length > 0) {
         doc.text('RECOMMENDATIONS:', 20, yPosition);
         yPosition += 10;
         trainingReport.recommendations.forEach(rec => {
           const lines = doc.splitTextToSize(`• ${rec}`, 170);
           doc.text(lines, 25, yPosition);
           yPosition += 8 * lines.length;
         });
       }
     }
     
     if (conversation.length > 0) {
       doc.addPage();
       doc.text('CONVERSATION TRANSCRIPT:', 20, 20);
       let yPosition = 35;
       
       conversation.forEach((message, index) => {
         const prefix = message.role === 'user' ? 'You: ' : `${persona} Prospect: `;
         const lines = doc.splitTextToSize(prefix + message.content, 170);
         
         doc.text(lines, 20, yPosition);
         yPosition += 8 * lines.length + 5;
         
         if (index < conversation.length - 1 && yPosition < 270) {
           doc.setDrawColor(200);
           doc.line(20, yPosition - 2, 190, yPosition - 2);
           yPosition += 5;
         }
         
         if (yPosition > 270 && index < conversation.length - 1) {
           doc.addPage();
           yPosition = 20;
         }
       });
     }
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
   
   doc.save(roleplay ? 'sales-training-report-fixed.pdf' : 'sales-feedback.pdf');
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
       AI Sales Trainer - Fixed Edition
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
           Enable Fixed Roleplay
         </label>
       </div>
     </div>

     {/* Enhanced Training Dashboard */}
     {roleplay && roleplayStarted && (
       <div style={{ 
         display: 'grid',
         gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr',
         gap: 15, 
         marginBottom: 20, 
         padding: 20, 
         backgroundColor: '#fff', 
         borderRadius: 12,
         boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
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
             {prospectEngagement === 'cold' && '❄️ Lost interest'}
             {prospectEngagement === 'neutral' && '😐 Cautiously listening'}
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
           placeholder={roleplay ? "Enter your initial pitch here to test the FIXED system..." : "Your pitch here..."}
           rows={5}
           style={{ 
             width: '100%', 
             padding: 12, 
             fontSize: 16, 
             borderRadius: 8, 
             marginBottom: 20,
             resize: 'vertical',
             boxSizing: 'border-box',
             border: roleplay ? '3px solid #4CAF50' : '1px solid #ccc'
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
               padding: '12px 24px',
               border: 'none',
               borderRadius: '8px',
               fontSize: '14px',
               fontWeight: 'bold',
               cursor: 'pointer'
             }}
           >
             {isLoading ? 'Analyzing...' : (roleplay && !roleplayStarted) ? 'Test Fixed System' : 'Get Feedback'}
           </button>
           <button 
             onClick={startVoice}
             style={{ 
               flex: isMobile ? '1 0 auto' : 'none',
               padding: '12px 20px',
               border: '1px solid #ccc',
               borderRadius: '8px',
               backgroundColor: '#f8f9fa'
             }}
           >
             🎤 Voice
           </button>
           <button 
             onClick={exportToPDF} 
             disabled={!feedback && conversation.length === 0 && !trainingReport}
             style={{ 
               flex: isMobile ? '1 0 auto' : 'none',
               padding: '12px 20px',
               border: '1px solid #ccc',
               borderRadius: '8px',
               backgroundColor: '#f8f9fa'
             }}
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

       {/* Right side - Fixed Roleplay Conversation */}
       {roleplay && (
         <div style={{ 
           flex: !isMobile ? 1 : 'auto',
           width: '100%'
         }}>
           <h3 style={{ marginBottom: 10 }}>
             🛠️ FIXED Training Session
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
             border: roleplayStarted ? `3px solid ${getEngagementColor()}` : '2px dashed #4CAF50',
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
                   border: message.role === 'prospect' && conversationPhase === 'ended' ? '2px solid #ff4444' : 
                          message.role === 'prospect' ? '1px solid #4CAF50' : 'none'
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
                 border: '2px dashed #4CAF50'
               }}>
                 <div style={{ fontSize: '48px', marginBottom: 15 }}>🛠️</div>
                 <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: 10, color: '#4CAF50' }}>
                   FIXED Sales Training System
                 </div>
                 <div style={{ fontSize: '14px', lineHeight: 1.5 }}>
                   The repetition issue has been fixed! Now each persona will respond with their unique personality and concerns.
                   <br/><strong>Test it:</strong> Try giving poor responses like "no" or "buy my course" - you'll see varied, persona-specific reactions!
                 </div>
               </div>
             )}
             
             {isTyping && (
               <div style={{ 
                 padding: 15, 
                 fontStyle: 'italic', 
                 color: '#666',
                 backgroundColor: '#e8f5e8',
                 borderRadius: 8,
                 marginTop: 10,
                 border: '2px solid #4CAF50'
               }}>
                 <span style={{ marginRight: 10 }}>🤔</span>
                 {personaOptions.find(p => p.value === persona)?.label} is generating a UNIQUE, persona-specific response...
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
                 <strong>Fixed Training Session Complete</strong>
                 
                 {trainingReport && (
                   <div style={{ 
                     marginTop: 15, 
                     textAlign: 'left', 
                     backgroundColor: '#fff', 
                     padding: 20, 
                     borderRadius: 8,
                     fontSize: '14px',
                     boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                   }}>
                     <h4 style={{ marginTop: 0, color: '#333' }}>📊 Training Performance Report</h4>
                     
                     <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 15, marginBottom: 15 }}>
                       <div>
                         <p style={{ margin: '5px 0' }}><strong>Session Length:</strong> {trainingReport.sessionLength} messages</p>
                         <p style={{ margin: '5px 0' }}><strong>Final Engagement:</strong> 
                          <span style={{ color: getEngagementColor(), fontWeight: 'bold', textTransform: 'uppercase' }}>
                             {trainingReport.finalEngagement}
                           </span>
                         </p>
                       </div>
                       <div>
                         <p style={{ margin: '5px 0' }}><strong>Max Challenge Level:</strong> {trainingReport.maxChallengeLevel}/5</p>
                         <p style={{ margin: '5px 0' }}><strong>Avg Response Quality:</strong> {trainingReport.averageResponseQuality}/10</p>
                       </div>
                     </div>
                     
                     {trainingReport.strengths.length > 0 && (
                       <div style={{ marginBottom: 15 }}>
                         <strong style={{ color: '#28a745' }}>✅ Strengths:</strong>
                         <ul style={{ marginTop: 5, paddingLeft: 20 }}>
                           {trainingReport.strengths.map((strength, i) => <li key={i} style={{ marginBottom: 3 }}>{strength}</li>)}
                         </ul>
                       </div>
                     )}
                     
                     {trainingReport.weaknesses.length > 0 && (
                       <div style={{ marginBottom: 15 }}>
                         <strong style={{ color: '#dc3545' }}>❌ Areas for Improvement:</strong>
                         <ul style={{ marginTop: 5, paddingLeft: 20 }}>
                           {trainingReport.weaknesses.map((weakness, i) => <li key={i} style={{ marginBottom: 3 }}>{weakness}</li>)}
                         </ul>
                       </div>
                     )}
                     
                     {trainingReport.recommendations.length > 0 && (
                       <div>
                         <strong style={{ color: '#007bff' }}>💡 Recommendations:</strong>
                         <ul style={{ marginTop: 5, paddingLeft: 20 }}>
                           {trainingReport.recommendations.map((rec, i) => <li key={i} style={{ marginBottom: 3 }}>{rec}</li>)}
                         </ul>
                       </div>
                     )}
                   </div>
                 )}
                 
                 <div style={{ marginTop: 15, fontSize: '14px', color: '#666' }}>
                   🎯 Fixed system tested! Toggle roleplay off/on to start a new session
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
                 roleplayStarted ? "Type your response to test the fixed system..." : 
                 "Start fixed training session first"
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
                 border: '2px solid #4CAF50'
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
                 padding: '0 24px',
                 backgroundColor: '#4CAF50',
                 color: 'white',
                 fontWeight: 'bold',
                 fontSize: '14px',
                 cursor: 'pointer',
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
               padding: 12,
               borderRadius: 8,
               border: '2px solid #4CAF50'
             }}>
               🛠️ <strong>Fixed System Ready:</strong> Submit your initial pitch above to test the persona-specific responses
             </div>
           )}
           
           {roleplayStarted && conversationPhase !== 'ended' && (
             <div style={{ 
               marginTop: 12, 
               fontSize: 12, 
               color: '#666', 
               textAlign: 'center',
               backgroundColor: '#fff3cd',
               padding: 10,
               borderRadius: 6,
               border: '1px solid #ffeeba'
             }}>
               🎯 <strong>Testing Tip:</strong> Try poor responses like "no" or "yes" to see how the {persona} persona reacts uniquely!
             </div>
           )}
         </div>
       )}
     </div>

     {/* Debug Console (only in roleplay mode) */}
     {roleplay && roleplayStarted && (
       <div style={{ 
         marginTop: 20, 
         padding: 15, 
         backgroundColor: '#f8f9fa', 
         borderRadius: 8, 
         border: '1px solid #ddd',
         fontSize: '12px',
         fontFamily: 'monospace'
       }}>
         <strong>🔧 Debug Info (Check Browser Console for detailed logs):</strong>
         <div>Current Persona: {persona}</div>
         <div>Engagement: {prospectEngagement}</div>
         <div>Challenge Level: {challengeLevel}/5</div>
         <div>Phase: {conversationPhase}</div>
         <div>Last Response Quality: {conversation.length > 0 ? analyzeUserInput(conversation.filter(m => m.role === 'user').slice(-1)[0]?.content || '').overallScore : 'N/A'}/10</div>
       </div>
     )}
   </div>
 );
}