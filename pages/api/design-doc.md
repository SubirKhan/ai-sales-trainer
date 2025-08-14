AI Sales Trainer - Design Document v18
Project Overview
The AI Sales Trainer is a comprehensive React.js web application that helps sales professionals improve their pitching skills through AI-powered feedback and sophisticated interactive roleplay scenarios. The system provides real-time analysis, personalized coaching, and adaptive training sessions with intelligent prospect personas.
Core Features Implemented
1. User Authentication System
Google OAuth Integration: One-click sign-in with GoogleAuthProvider
Email/Password Authentication: Traditional signup/login flow
Firebase Auth Integration: Complete session management with onAuthStateChanged
Persistent User State: Automatic authentication state recovery
2. Advanced Pitch Analysis Engine
Multi-Modal Input: Text area and voice-to-text capability using Web Speech API
5-Dimension AI Evaluation System:
Confidence (0-10 scale)
Clarity (0-10 scale)
Structure (0-10 scale)
Authenticity (0-10 scale)
Persuasiveness (0-10 scale)
Detailed Performance Insights:
Strongest line identification
Weakest line identification
Comprehensive coaching comments
Visual Performance Dashboard: Radar chart using Recharts library
3. Sophisticated Interactive Roleplay System
Enhanced Prompt Engine
Comprehensive Persona Psychology Definitions: 9 distinct buyer personas with detailed psychological profiles
Advanced User Input Analysis: Real-time quality scoring across 5 metrics
Dynamic Engagement Calculation: Persona-specific engagement adjustments
Anti-Repetition System: Prevents identical AI responses through sophisticated detection
Adaptive Challenge System
Dynamic Engagement Tracking: 4-level system (cold, neutral, warm, hot) with color-coded UI
Progressive Challenge Levels: 1-5 scale that adapts based on user performance
Conversation Phase Management: 5 distinct phases (discovery, presentation, objection_handling, closing, ended)
Real-Time Performance Evaluation: Continuous assessment of user response quality
Training Report Generation
Session Analysis: Comprehensive evaluation of entire training session
Performance Metrics: Average response quality, engagement progression, challenge level reached
Strengths & Weaknesses Identification: Automated analysis with specific feedback
Persona-Specific Recommendations: Tailored advice based on prospect type
4. Nine Distinct Buyer Personas
Completely New Person: Unfamiliar with industry, needs basic education
Decision Maker: Authority-focused, ROI-driven, time-conscious
Skeptical Prospect: Doubtful, needs extensive proof, challenges claims
Time-Crunched Executive: Extremely impatient, strategic thinker
Budget-Conscious Buyer: Cost-focused, seeks value justification
Technical Expert: Specification-driven, integration-focused
Emotional Buyer: Relationship-based, feeling-driven decisions
Warm Lead: Already interested, needs final convincing
Competitor: Information gathering, comparison-focused
5. Advanced UI/UX Features
Responsive Design: Mobile-optimized with dynamic layouts
Real-Time Training Dashboard: Live engagement, challenge level, and phase indicators
Enhanced Message Controls: Explicit send mechanisms, no auto-sending
Visual State Indicators: Clear feedback on system status and user actions
Debug Console: Development-friendly logging and state inspection
Modern Typography: Nunito font family with polished styling
Enhanced Visual Design: Rounded corners, shadows, and warm color scheme (#faf8f5)
6. Export and Reporting
PDF Generation: Complete training reports with jsPDF
Session Transcripts: Full conversation history with performance analysis
Performance Visualization: Exportable radar charts and metrics
Technical Architecture
Frontend Stack
Framework: React.js with functional components
State Management: React hooks (useState, useEffect, useRef)
UI Libraries:
Recharts for data visualization
Custom responsive design system
Browser APIs: Web Speech API for voice recognition
Backend Integration
Authentication: Firebase Auth with Google and email providers
Database: Firebase Firestore for user data and conversation history
AI Integration: OpenAI API through custom /api/feedback endpoint
PDF Generation: Client-side jsPDF library
State Management Architecture
// Core Application State
const [user, setUser] = useState(null);
const [pitch, setPitch] = useState('');
const [feedback, setFeedback] = useState(null);
const [isLoading, setIsLoading] = useState(false);

// Roleplay System State
const [roleplay, setRoleplay] = useState(false);
const [conversation, setConversation] = useState([]);
const [roleplayStarted, setRoleplayStarted] = useState(false);
const [isProcessingMessage, setIsProcessingMessage] = useState(false);

// Advanced Training State
const [prospectEngagement, setProspectEngagement] = useState('neutral');
const [challengeLevel, setChallengeLevel] = useState(1);
const [conversationPhase, setConversationPhase] = useState('discovery');
const [trainingReport, setTrainingReport] = useState(null);

// Configuration State
const [coachTone, setCoachTone] = useState('friendly');
const [persona, setPersona] = useState('new');

AI Integration Architecture
Input Analysis System
const analyzeUserInput = (userMessage) => {
  return {
    quality: 0-10,        // Response detail and structure
    specificity: 0-10,    // Concrete examples and data
    valueProposition: 0-10, // Clear benefits articulation
    credibility: 0-10,    // Proof and evidence
    engagement: 0-10,     // Questions and personalization
    insights: [],         // Specific improvement areas
    overallScore: 0-10    // Weighted total score
  };
};

Persona Psychology Engine
Mindset Modeling: Detailed psychological profiles for each persona
Behavioral Patterns: Specific response styles and triggers
Challenge Strategies: Persona-appropriate objection styles
Response Libraries: Curated response sets preventing repetition
Engagement Calculation Algorithm
Persona-Specific Weightings: Different success metrics per persona type
Performance-Based Progression: Dynamic difficulty adjustment
Phase-Aware Responses: Context-sensitive interaction patterns
Anti-Repetition System
Response History Tracking: Monitors last 3 AI responses
Content Similarity Detection: Prevents recycled responses
Forced Persona Fallbacks: Ensures variety in AI responses
Quality-Based Response Selection: Poor input triggers challenging responses
Performance Evaluation Engine
Real-Time Scoring: Continuous assessment during conversation
Persona-Specific Metrics: Different success criteria per buyer type
Progressive Difficulty: Automatic challenge level adjustment
Session Summary Generation: Comprehensive training reports
Responsive Design System
Mobile-First Approach: Optimized for all screen sizes
Dynamic Layouts: Flexible grid systems
Touch-Friendly Controls: Mobile interaction optimization
Adaptive Typography: Screen-size appropriate text scaling
Enhanced Visual Polish: Modern styling with Nunito font and shadows
Security Implementation
Firebase Security Rules: Database access control
API Key Management: Environment variable protection
Input Sanitization: XSS prevention
Rate Limiting: API abuse prevention
Error Handling & Fallbacks
API Failure Recovery: Graceful degradation with persona responses
Network Error Handling: User-friendly error messages
State Recovery: Automatic cleanup on errors
Debug Logging: Development-friendly error tracking
JSON Response Parsing: Robust AI response extraction with fallback handling
Development Features
Debug Console: Real-time state inspection
Performance Logging: API response tracking
State Visualization: Current engagement/challenge display
Development Flags: Feature toggling capabilities
Console Logging: Enhanced debugging with AI response tracking
Future Enhancement Roadmap
Advanced Analytics: Historical performance tracking
Team Features: Multi-user training sessions
Industry Templates: Vertical-specific pitch frameworks
Real-Time Coaching: Live call assistance
Mobile App: Native mobile application
CRM Integration: Salesforce/HubSpot connectivity

This design document reflects the current implementation as of the codebase provided. All features listed are implemented and functional in the current system.