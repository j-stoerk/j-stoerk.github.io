import React, { useState, useEffect } from "react";
import { 
  Flame, 
  Sparkles, 
  Heart, 
  Bookmark, 
  MessageCircle, 
  ChevronUp, 
  ChevronDown, 
  Check, 
  X, 
  RotateCcw, 
  Plus, 
  CornerDownLeft, 
  TrendingUp,
  Brain,
  Award,
  BookOpen
} from "lucide-react";
import Sidebar from "./components/Sidebar";
import AnimationSimulator from "./components/AnimationSimulator";
import { LearningCard, UserStats } from "./types";
import { INITIAL_PRESEED_CARDS } from "./preseeds";
import { generateClientSideCard, generateClientSideCoachComment } from "./clientSynthesizer";

export default function App() {
  // --- Core States ---
  const [cards, setCards] = useState<LearningCard[]>(INITIAL_PRESEED_CARDS);
  const [loading, setLoading] = useState<boolean>(false);
  const [currentSubject, setCurrentSubject] = useState<string>("all");
  const [activeIndex, setActiveIndex] = useState<number>(0);
  
  // --- Exploration Pathway Mode ---
  // Users choose one of 3 ways to continue exploring: 
  // 'premise' (intitial hook) | 'theory' (🔬 Deconstruct Theory) | 'quiz' (🎯 Test Intuition) | 'socratic' (💬 AI Socratic Probe)
  const [explorationMode, setExplorationMode] = useState<"premise" | "theory" | "quiz" | "socratic">("premise");

  // --- Feature States ---
  const [userStats, setUserStats] = useState<UserStats>({
    xp: 120, 
    streak: 3,
    completedQuizzesCount: 2,
    subjectMastey: {
      "Space & Physics": 45,
      "World History": 20,
      "Biology & Chemistry": 30,
      "Math & CS": 15
    }
  });

  // Client Likes, Bookmark, and Follow Storage
  const [likedCardIds, setLikedCardIds] = useState<Record<string, boolean>>({});
  const [bookmarkedCardIds, setBookmarkedCardIds] = useState<Record<string, boolean>>({});
  const [followedCreators, setFollowedCreators] = useState<Record<string, boolean>>({});
  
  // Interactive Socratic AI commenting stream
  const [commentText, setCommentText] = useState<string>("Why does this operate under these rules?");
  const [isSendingComment, setIsSendingComment] = useState<boolean>(false);

  // Quiz submission state for current card
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null);

  // AI Topic Lab generation
  const [customTopic, setCustomTopic] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationFeedback, setGenerationFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  // Likes Counter multipliers
  const [extraLikesCount, setExtraLikesCount] = useState<Record<string, number>>({});

  // Target notifications
  const [notification, setNotification] = useState<string | null>(null);

  // --- Fetch Initial Lessons ---
  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await fetch("/api/cards");
      if (res.ok) {
        const data = await res.json();
        if (data && data.cards && data.cards.length > 0) {
          setCards(data.cards);
        }
      }
    } catch (e) {
      console.warn("Backend API unavailable. Carrying out local academic synthesis protocol.", e);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // --- Helpers for Filtering ---
  const filteredCards = cards.filter(card => {
    if (currentSubject === "all") return true;
    return card.subject === currentSubject;
  });

  // Reset pathway mode & quiz entries each time card or feed alters
  useEffect(() => {
    setActiveIndex(0);
    setExplorationMode("premise");
    handleResetQuiz();
  }, [currentSubject]);

  const activeCard: LearningCard | undefined = filteredCards[activeIndex];

  // Reset exploration sub-tabs when active index shifts
  useEffect(() => {
    setExplorationMode("premise");
    handleResetQuiz();
  }, [activeIndex]);

  // --- Navigation Handlers ---
  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveIndex(prev => prev - 1);
    }
  };

  const handleNext = () => {
    if (activeIndex < filteredCards.length - 1) {
      setActiveIndex(prev => prev + 1);
    }
  };

  // Key listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        handlePrev();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filteredCards.length]);

  // --- Interactive Feature Handlers ---
  const handleLike = (cardId: string) => {
    const isLiked = likedCardIds[cardId];
    setLikedCardIds(prev => ({ ...prev, [cardId]: !isLiked }));
    setExtraLikesCount(prev => ({
      ...prev,
      [cardId]: (prev[cardId] || 0) + (isLiked ? -1 : 1)
    }));
  };

  const handleBookmark = (cardId: string) => {
    const isBookmarked = bookmarkedCardIds[cardId];
    setBookmarkedCardIds(prev => ({ ...prev, [cardId]: !isBookmarked }));
  };

  const handleFollow = (creator: string) => {
    const isFollowed = followedCreators[creator];
    setFollowedCreators(prev => ({ ...prev, [creator]: !isFollowed }));
    showNotification(`Following ${creator}`);
  };

  // --- AI Topic Lab Generator ---
  const handleGenerateCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTopic.trim() || isGenerating) return;

    try {
      setIsGenerating(true);
      setGenerationFeedback(null);
      
      let cardGenerated = false;

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: customTopic, subject: currentSubject !== "all" ? currentSubject : undefined })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.card) {
            setCards(prev => [data.card, ...prev]);
            cardGenerated = true;
          }
        }
      } catch (innerError) {
        console.warn("Express backend unavailable. Engaging local AI synthesis engine.", innerError);
      }

      // Secure elegant fallback to local synthesis if network was offline or rejected
      if (!cardGenerated) {
        const fallbackCard = generateClientSideCard(customTopic, currentSubject);
        setCards(prev => [fallbackCard, ...prev]);
      }

      setCustomTopic("");
      setCurrentSubject("all"); 
      setActiveIndex(0);
      showNotification(`Concept synthesized successfully!`);
      
    } catch (err) {
      setGenerationFeedback({ text: "Synthesis offline. Verify installation.", isError: true });
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Socratic AI Chat / Comments Message Submission ---
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !activeCard || isSendingComment) return;

    const currentCardId = activeCard.id;
    const origText = commentText;
    setCommentText("");

    try {
      setIsSendingComment(true);
      let commentPosted = false;

      try {
        const res = await fetch("/api/comment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardId: currentCardId,
            username: "CuriousScholar",
            text: origText
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.userComment && data.aiComment) {
            setCards(prev => prev.map(c => {
              if (c.id === currentCardId) {
                return {
                  ...c,
                  comments: [...(c.comments || []), data.userComment, data.aiComment]
                };
              }
              return c;
            }));
            commentPosted = true;
          }
        }
      } catch (innerError) {
        console.warn("Socratic server route unreachable. Engaging local AI coach companion.", innerError);
      }

      // Elegant local AI Coach chat simulation for static/offline runs!
      if (!commentPosted) {
        const { userComment, aiComment } = generateClientSideCoachComment(activeCard, origText);
        setCards(prev => prev.map(c => {
          if (c.id === currentCardId) {
            return {
              ...c,
              comments: [...(c.comments || []), userComment, aiComment]
            };
          }
          return c;
        }));
      }

    } catch (e) {
      console.error("Failed to post educational commentary.", e);
    } finally {
      setIsSendingComment(false);
    }
  };

  // --- Diagnostic Quiz Logic ---
  const handleOptionSelect = (index: number) => {
    if (quizSubmitted) return;
    setSelectedOption(index);
  };

  const handleQuizSubmit = () => {
    if (selectedOption === null || !activeCard || quizSubmitted) return;

    const isCorrect = selectedOption === activeCard.quiz.correctAnswerIndex;
    setIsAnswerCorrect(isCorrect);
    setQuizSubmitted(true);

    if (isCorrect) {
      setUserStats(prev => {
        const incrementedCount = prev.completedQuizzesCount + 1;
        const currentMastey = prev.subjectMastey[activeCard.subject] || 0;
        const newMastey = Math.min(currentMastey + 15, 100);

        return {
          ...prev,
          xp: prev.xp + 50,
          completedQuizzesCount: incrementedCount,
          streak: prev.streak + (incrementedCount === 5 ? 1 : 0),
          subjectMastey: {
            ...prev.subjectMastey,
            [activeCard.subject]: newMastey
          }
        };
      });
      showNotification("Correct! +50 XP");
    } else {
      showNotification("Incorrect theory. Try reviewing carefully!");
    }
  };

  const handleResetQuiz = () => {
    setSelectedOption(null);
    setQuizSubmitted(false);
    setIsAnswerCorrect(null);
  };

  const displayXP = userStats.xp * 10; 

  return (
    <div 
      id="immersive-root-app-layout"
      className="w-full min-h-screen bg-neutral-950 text-white flex flex-col md:flex-row overflow-x-hidden font-sans select-none"
    >
      {/* 1. Left NAVIGATION Sidebar (w-56) */}
      <Sidebar 
        currentSubject={currentSubject}
        onSelectSubject={setCurrentSubject}
        userStats={userStats}
        customTopic={customTopic}
        setCustomTopic={setCustomTopic}
        onGenerateCustom={handleGenerateCustom}
        isGenerating={isGenerating}
      />

      {/* 2. Main Feed Area (Dramatically emphasized center feed) */}
      <main className="flex-1 flex flex-col items-center justify-center p-3 relative bg-black min-h-[calc(100vh-80px)] md:h-screen overflow-hidden">
        
        {/* Toast alerts */}
        {notification && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-cyan-500 font-bold px-5 py-2 rounded-full shadow-lg text-[11px] text-black tracking-wider uppercase transition-all duration-300">
            {notification}
          </div>
        )}

        {/* Global error panels */}
        {generationFeedback && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-rose-950 border border-rose-500/30 text-rose-200 text-[10px] px-4 py-2.5 rounded-lg shadow-xl flex items-center justify-between gap-3 max-w-xs">
            <span>{generationFeedback.text}</span>
            <button onClick={() => setGenerationFeedback(null)} className="text-white hover:text-rose-400">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Center TikTok Card Frame with External Floating Panel */}
        <div className="flex-1 flex flex-col md:flex-row items-center justify-center relative py-2 w-full max-w-[530px] gap-4 px-2">
          {loading ? (
            <div className="flex flex-col items-center space-y-2">
              <svg className="animate-spin h-8 w-8 text-cyan-400" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <p className="text-[10px] font-mono text-white/40 tracking-widest">SYNTHESIZING CURIO CHANNELS...</p>
            </div>
          ) : activeCard ? (
            <>
              <div className="relative flex-1 w-full max-w-[430px] h-[82vh] md:h-full aspect-[9/16] bg-[#0c0c0c] rounded-[1.75rem] overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] border border-white/5 flex flex-col justify-between">
                
                {/* Animation Background Canvas */}
                <AnimationSimulator 
                  animationType={activeCard.animationType}
                  isActive={true}
                />

                {/* Elegant Scientific/Historical Watermark Notation in background */}
                {activeCard.backgroundNotation && (
                  <div 
                    className="absolute top-[28%] left-[-8%] w-[116%] overflow-hidden pointer-events-none select-none z-[1] text-white/[0.022] font-mono text-[2.2rem] md:text-[2.6rem] leading-none tracking-[0.2em] font-black uppercase rotate-[-8deg] break-all line-clamp-3 select-none"
                    style={{ textShadow: "0 0 45px rgba(255,255,255,0.01)" }}
                  >
                    {activeCard.backgroundNotation}
                  </div>
                )}

                {/* Gradient Scrims */}
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/90 to-transparent pointer-events-none z-10" />
                <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/95 to-transparent pointer-events-none z-10" />

                {/* Header Bar */}
                <div className="absolute top-4 left-4 right-4 z-20 flex justify-between items-center bg-black/30 backdrop-blur-md p-1.5 px-3 rounded-full border border-white/5">
                  <span className="text-[9px] font-bold text-cyan-400 tracking-widest">
                    {activeCard.subject.toUpperCase()}
                  </span>
                  <span className="text-[9px] text-white/50 font-mono tracking-tight font-bold">
                    {activeIndex + 1} OF {filteredCards.length}
                  </span>
                </div>

                {/* DYNAMIC MIDDLE EXPLORATION CONTAINER */}
                <div className="flex-1 flex flex-col justify-center px-4 md:px-5 mt-16 z-20 overflow-hidden">
                  <div className="bg-black/85 backdrop-blur-md border border-white/5 p-4 rounded-2xl w-full flex flex-col gap-3 max-h-[82%] overflow-y-auto no-scrollbar shadow-2xl">
                    
                    {/* Common Header Title */}
                    <h2 className="text-sm md:text-base font-black text-white leading-snug tracking-tight text-center">
                      {activeCard.title}
                    </h2>

                    {/* Premium persistent sub-navigation tabs */}
                    <div id="pathway-tabs-container" className="grid grid-cols-4 gap-0.5 bg-neutral-900/95 p-0.5 rounded-lg border border-white/5 overflow-hidden text-[9px] shrink-0 font-bold tracking-tight">
                      <button
                        id="tab-btn-premise"
                        onClick={() => setExplorationMode("premise")}
                        className={`py-1.5 rounded-[5px] transition-all cursor-pointer text-center ${
                          explorationMode === "premise" 
                            ? "bg-cyan-500 text-black font-extrabold shadow" 
                            : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                        }`}
                      >
                        Hook
                      </button>
                      <button
                        id="tab-btn-theory"
                        onClick={() => setExplorationMode("theory")}
                        className={`py-1.5 rounded-[5px] transition-all cursor-pointer text-center ${
                          explorationMode === "theory" 
                            ? "bg-cyan-500 text-black font-extrabold shadow" 
                            : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                        }`}
                      >
                        Theory
                      </button>
                      <button
                        id="tab-btn-quiz"
                        onClick={() => setExplorationMode("quiz")}
                        className={`py-1.5 rounded-[5px] transition-all cursor-pointer text-center ${
                          explorationMode === "quiz" 
                            ? "bg-cyan-500 text-black font-extrabold shadow" 
                            : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                        }`}
                      >
                        Quiz
                      </button>
                      <button
                        id="tab-btn-socratic"
                        onClick={() => setExplorationMode("socratic")}
                        className={`py-1.5 rounded-[5px] transition-all cursor-pointer text-center ${
                          explorationMode === "socratic" 
                            ? "bg-indigo-500 text-white font-extrabold shadow" 
                            : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                        }`}
                      >
                        Coach
                      </button>
                    </div>

                    {/* Pathway 0: Brief Hook */}
                    {explorationMode === "premise" && (
                      <div className="space-y-3.5 flex-1 flex flex-col justify-between">
                        <p className="text-[11px] text-white/90 leading-relaxed text-justify font-sans">
                          {activeCard.content}
                        </p>
                        
                        <div className="bg-cyan-500/5 border border-cyan-500/15 p-2 rounded-xl text-center">
                          <p className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
                            Interactive Channels Engaged
                          </p>
                          <p className="text-[8.5px] text-white/50 mt-0.5 leading-normal">
                            Switch tabs above to parse the rigorous scientific theory, test your analytical intuition, or consult our AI Socratic Coach.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Pathway 1: Deconstruct Theory */}
                    {explorationMode === "theory" && (
                      <div className="space-y-3 flex-1 flex flex-col justify-between">
                        <div className="bg-cyan-950/25 p-3 rounded-xl border-l-[3px] border-cyan-400 text-justify">
                          <p className="text-[8px] font-mono text-cyan-400 uppercase tracking-widest font-bold mb-1">🔬 ABSTRACT FORMALISM</p>
                          <p className="text-[11px] text-white/90 leading-relaxed font-sans text-justify">
                            {activeCard.detailedTheory || "Review this concept's fundamental mechanics using our interactive quiz or the Socratic Coach."}
                          </p>
                        </div>

                        <div className="bg-white/[0.02] p-2.5 rounded-lg border border-white/5">
                          <p className="text-[8px] font-mono text-white/40 uppercase tracking-wider mb-1">Theoretical Foundations</p>
                          <div className="text-[9px] text-white/70 space-y-1 font-sans">
                            <p>• Mathematical equations and physical laws apply.</p>
                            <p>• Verified dynamically against contemporary academic models.</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pathway 2: Test Intuition (Diagnostic Quiz) */}
                    {explorationMode === "quiz" && (
                      <div className="space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          <p className="text-[11.5px] font-bold text-white tracking-tight text-justify">
                            {activeCard.quiz.question}
                          </p>
                          
                          <div className="space-y-1.5 py-1.5">
                            {activeCard.quiz.options.map((option, idx) => {
                              const isSelected = selectedOption === idx;
                              let tileStyle = "border-white/5 bg-white/[0.01] hover:bg-white/5 text-white/95";
                              let badgeStyle = "bg-white/5 text-white/30";
                              
                              if (isSelected) {
                                if (quizSubmitted) {
                                  if (idx === activeCard.quiz.correctAnswerIndex) {
                                    tileStyle = "bg-emerald-500/10 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/20";
                                    badgeStyle = "bg-emerald-500 text-neutral-950 font-extrabold";
                                  } else {
                                    tileStyle = "bg-rose-500/10 border-rose-400 text-rose-200 ring-1 ring-rose-400/20";
                                    badgeStyle = "bg-rose-500 text-white font-extrabold";
                                  }
                                } else {
                                  tileStyle = "bg-cyan-500/10 border-cyan-400 text-cyan-200 ring-1 ring-cyan-400/20";
                                  badgeStyle = "bg-cyan-500 text-neutral-950 font-extrabold";
                                }
                              } else if (quizSubmitted && idx === activeCard.quiz.correctAnswerIndex) {
                                tileStyle = "bg-emerald-500/10 border-emerald-400 text-emerald-200 ring-1 ring-emerald-400/20";
                                badgeStyle = "bg-emerald-500 text-neutral-950 font-extrabold";
                              }

                              return (
                                <button
                                  key={idx}
                                  disabled={quizSubmitted}
                                  onClick={() => handleOptionSelect(idx)}
                                  className={`w-full text-left p-2 rounded-lg border text-[10px] leading-snug transition-all duration-200 flex items-center gap-2.5 cursor-pointer ${tileStyle}`}
                                >
                                  <span className={`w-5 h-5 rounded-md flex items-center justify-center font-mono text-[9px] font-extrabold shrink-0 shadow-sm transition-all ${badgeStyle}`}>
                                    {String.fromCharCode(65 + idx)}
                                  </span>
                                  <span className="flex-1 font-sans">{option}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="mt-auto space-y-1.5">
                          {quizSubmitted && (
                            <div className="p-2.5 bg-neutral-900/60 rounded-xl border border-white/5 text-[9px] text-white/70 leading-normal">
                              <p className={`font-black uppercase tracking-wider text-[8px] mb-0.5 ${isAnswerCorrect ? "text-emerald-400" : "text-amber-400"}`}>
                                {isAnswerCorrect ? "Verification Success" : "Theoretical Analysis"}
                              </p>
                              <p>{activeCard.quiz.explanation}</p>
                            </div>
                          )}

                          <div className="flex gap-1">
                            {!quizSubmitted ? (
                              <button
                                onClick={handleQuizSubmit}
                                disabled={selectedOption === null}
                                className="flex-1 py-1.5 bg-cyan-400 hover:bg-cyan-300 disabled:opacity-20 text-black font-extrabold rounded-lg text-[9px] uppercase tracking-wider cursor-pointer transition-all active:scale-95 shadow-lg"
                              >
                                Submit Answer
                              </button>
                            ) : (
                              <button
                                onClick={handleResetQuiz}
                                className="flex-1 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-[9px] text-white font-bold cursor-pointer transition-all active:scale-95"
                              >
                                Try Again
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Pathway 3: Socratic Dialogue Probe (AI Chat) */}
                    {explorationMode === "socratic" && (
                      <div className="space-y-2 flex flex-col h-[280px]">
                        <p className="text-[10px] text-white/50 leading-tight">
                          Consult the Socratic Coach below. Ask any conceptual question to verify your understanding.
                        </p>

                        {/* Socratic quick-triggers suggestions */}
                        {!isSendingComment && (
                          <div className="flex flex-wrap gap-1 shrink-0">
                            {[
                              "Give me an analogy.",
                              "How does this fail at scale?",
                              "What is a counter-argument?"
                            ].map((suggest, sIdx) => (
                              <button
                                key={sIdx}
                                type="button"
                                onClick={() => {
                                  setCommentText(suggest);
                                }}
                                className="text-[8px] px-2.5 py-0.5 bg-white/[0.03] border border-white/5 rounded-full text-white/50 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                              >
                                {suggest}
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Dialogue Stream feed list */}
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 no-scrollbar text-[10px] scroll-smooth my-1 border-t border-b border-white/5 py-1">
                          {activeCard.comments && activeCard.comments.length > 0 ? (
                            activeCard.comments.map((comm) => (
                              <div 
                                key={comm.id} 
                                className={`p-2 rounded-lg border ${
                                  comm.isAiResponse 
                                    ? "bg-cyan-950/20 border-cyan-500/20" 
                                    : "bg-white/[0.01] border-white/5"
                                }`}
                              >
                                <div className="flex justify-between text-[8px] text-white/40 mb-0.5">
                                  <span className={comm.isAiResponse ? "text-cyan-400 font-bold" : "text-white/60"}>
                                    @{comm.username} {comm.isAiResponse && "🎓 Coach"}
                                  </span>
                                  <span>{comm.timestamp}</span>
                                </div>
                                <p className="text-white/85 leading-relaxed">{comm.text}</p>
                              </div>
                            ))
                          ) : (
                            <div className="h-full flex flex-col items-center justify-center text-white/30 py-6">
                              <p>Dialogue feed empty.</p>
                            </div>
                          )}
                        </div>

                        {/* Comment Form */}
                        <form onSubmit={handleCommentSubmit} className="flex gap-1 pt-1 shrink-0">
                          <input
                            type="text"
                            placeholder="Query structural details..."
                            value={commentText}
                            disabled={isSendingComment}
                            onChange={(e) => setCommentText(e.target.value)}
                            className="flex-1 bg-black border border-white/10 rounded-lg px-2.5 py-1.5 text-[10px] text-white focus:outline-none focus:border-cyan-400"
                          />
                          <button
                            type="submit"
                            disabled={!commentText.trim() || isSendingComment}
                            className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-3 rounded-lg text-[9px] transition-colors"
                          >
                            Ask
                          </button>
                        </form>
                      </div>
                    )}

                  </div>
                </div>

                {/* Card Footer Section */}
                <div className="p-4 z-20 shrink-0">
                  <div className="bg-black/40 backdrop-blur-md p-2 rounded-xl">
                    <div className="flex items-center space-x-1.5">
                      <span className="font-extrabold text-[11px] text-cyan-300">
                        {activeCard.creator}
                      </span>
                      <button 
                        disabled={followedCreators[activeCard.creator]}
                        onClick={() => handleFollow(activeCard.creator)}
                        className="px-1.5 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-full text-[8px] uppercase tracking-wide pointer-events-auto cursor-pointer"
                      >
                        {followedCreators[activeCard.creator] ? "Subbed" : "Follow"}
                      </button>
                    </div>
                    
                    <p className="text-[10px] text-white/60 font-medium line-clamp-1 mt-1">
                      {activeCard.hashtags.map(tag => `#${tag}`).join(" ")}
                    </p>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-white/10 h-0.5 rounded-full mt-2.5 overflow-hidden">
                    <div 
                      className="h-full bg-cyan-400 transition-all duration-300"
                      style={{ width: `${((activeIndex + 1) / filteredCards.length) * 100}%` }}
                    />
                  </div>
                </div>

              </div>

              {/* EXTERNAL CARD INTERACTION PALETTE (Relocated to the right as sibling to avoid overlaps!) */}
              <div className="flex flex-row md:flex-col items-center justify-center gap-3.5 bg-neutral-900/45 backdrop-blur-md p-2 py-3.5 rounded-3xl md:rounded-full border border-white/5 shadow-2xl shrink-0 z-20">
                
                {/* Profile Pic */}
                <div className="relative">
                  <div className="w-8 h-8 rounded-full border border-cyan-400 overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-[9px] uppercase font-mono">
                    {activeCard.creator.substring(1, 4)}
                  </div>
                </div>

                {/* Like Button */}
                <button 
                  onClick={() => handleLike(activeCard.id)}
                  className="flex flex-col items-center space-y-0.5 group cursor-pointer"
                  title="Like Card"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    likedCardIds[activeCard.id] 
                      ? "text-cyan-400 scale-110" 
                      : "text-white/60 hover:text-white hover:scale-105"
                  }`}>
                    <Heart className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[8px] font-bold font-mono tracking-tight text-white/50">
                    {(activeCard.likes + (extraLikesCount[activeCard.id] || 0)).toLocaleString()}
                  </span>
                </button>

                {/* Bookmark Button */}
                <button 
                  onClick={() => handleBookmark(activeCard.id)}
                  className="flex flex-col items-center space-y-0.5 group cursor-pointer"
                  title="Bookmark Lesson"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 ${
                    bookmarkedCardIds[activeCard.id] 
                      ? "text-cyan-400 scale-110" 
                      : "text-white/60 hover:text-white hover:scale-105"
                  }`}>
                    <Bookmark className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-[8px] font-bold font-mono text-white/50">
                    {(activeCard.bookmarks + (bookmarkedCardIds[activeCard.id] ? 1 : 0)).toLocaleString()}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-6 bg-neutral-900/40 border border-white/5 rounded-2xl max-w-xs">
              <p className="text-xs font-bold text-white/60">No cards inside this feed.</p>
              <button 
                onClick={() => setCurrentSubject("all")}
                className="mt-3 px-3 py-1.5 bg-white text-black text-[10px] uppercase font-black tracking-wider rounded-lg"
              >
                Reset Feed View
              </button>
            </div>
          )}

          {/* Core Vertical Navigation Helpers */}
          {filteredCards.length > 1 && (
            <div className="absolute right-6 bottom-4 flex md:flex-col gap-1.5 z-20">
              <button 
                onClick={handlePrev}
                disabled={activeIndex === 0}
                className="w-8 h-8 bg-black/60 backdrop-blur-md hover:bg-neutral-900 disabled:opacity-20 flex items-center justify-center rounded-lg border border-white/5 text-white cursor-pointer active:scale-95"
                title="Up"
              >
                <ChevronUp className="h-4.5 w-4.5" />
              </button>
              <button 
                onClick={handleNext}
                disabled={activeIndex === filteredCards.length - 1}
                className="w-8 h-8 bg-black/60 backdrop-blur-md hover:bg-neutral-900 disabled:opacity-20 flex items-center justify-center rounded-lg border border-white/5 text-white cursor-pointer active:scale-95"
                title="Down"
              >
                <ChevronDown className="h-4.5 w-4.5" />
              </button>
            </div>
          )}
        </div>
      </main>

      {/* 3. Right Content Sidepanel (Mastery & rankings made MUCH slimmer: w-52 instead of w-76) */}
      <aside className="no-scrollbar w-full md:w-52 border-t md:border-t-0 md:border-l border-white/5 bg-black p-4 flex flex-col justify-between shrink-0 font-sans">
        
        <div className="space-y-5">
          {/* Alignment */}
          <div className="bg-white/[0.01] rounded-xl p-3 border border-white/5 space-y-2.5">
            <div className="flex items-center space-x-1.5">
              <TrendingUp className="h-3 w-3 text-cyan-400" />
              <h4 className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Alignment</h4>
            </div>

            <div className="space-y-2 text-[10px]">
              {Object.entries(userStats.subjectMastey).map(([subject, mastey]) => (
                <div key={subject}>
                  <div className="flex justify-between text-white/70 mb-0.5">
                    <span className="truncate pr-1">{subject}</span>
                    <span className="text-cyan-400 font-bold">{mastey}%</span>
                  </div>
                  <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                    <div 
                      className="bg-cyan-400 h-full transition-all duration-300" 
                      style={{ width: `${mastey}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* rankings */}
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 px-1">
              <Award className="h-3 w-3 text-cyan-400" />
              <h4 className="text-[9px] font-bold text-white/50 uppercase tracking-widest">Honor Roll</h4>
            </div>

            <div className="space-y-1.5 text-[10px]">
              <div className="flex items-center justify-between p-1.5 px-2 bg-white/[0.01] border border-white/5 rounded-lg">
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-mono text-yellow-500 font-bold">1</span>
                  <span className="truncate text-white/80">StudyMage</span>
                </div>
                <span className="text-[9px] text-white/40">12,400 XP</span>
              </div>

              <div className="flex items-center justify-between p-1.5 px-2 bg-white/[0.01] border border-white/5 rounded-lg">
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-mono text-slate-400 font-bold">2</span>
                  <span className="truncate text-white/80">BrainBox</span>
                </div>
                <span className="text-[9px] text-white/40">10,150 XP</span>
              </div>

              <div className="flex items-center justify-between p-1.5 px-2 bg-cyan-500/5 border border-cyan-400/20 rounded-lg">
                <div className="flex items-center space-x-2 truncate">
                  <span className="font-mono text-cyan-400 font-bold">3</span>
                  <span className="truncate text-cyan-400 font-bold">You</span>
                </div>
                <span className="text-[9px] text-cyan-400 font-mono font-bold">{displayXP} XP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global indicator */}
        <div className="pt-3 border-t border-white/5 text-[8px] font-mono text-white/30 text-center uppercase tracking-widest">
          Curio Feed Matrix
        </div>
      </aside>
    </div>
  );
}
