import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Zap, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Users, 
  Brain,
  Target,
  BarChart3,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Image,
  PieChart,
  Workflow,
  RefreshCw,
  Trophy,
  Lightbulb,
  HelpCircle
} from "lucide-react";

// Business challenges (problems) - Left side
const businessChallenges = [
  {
    id: "challenge-1",
    icon: Clock,
    text: "Spending hours creating ads manually",
    hint: "Think automation...",
  },
  {
    id: "challenge-2",
    icon: DollarSign,
    text: "Wasting money on poorly targeted ads",
    hint: "Who knows your audience best?",
  },
  {
    id: "challenge-3",
    icon: AlertTriangle,
    text: "Losing leads due to slow follow-up",
    hint: "Speed matters in sales...",
  },
  {
    id: "challenge-4",
    icon: PieChart,
    text: "No visibility into what's working",
    hint: "Data tells the story...",
  },
  {
    id: "challenge-5",
    icon: Image,
    text: "Struggling to create engaging visuals",
    hint: "Let technology create...",
  },
];

// Sociovia solutions (answers) - Right side
const socioviaSolutions = [
  {
    id: "solution-1",
    matchId: "challenge-1",
    icon: Zap,
    text: "AI auto-generates campaigns in minutes",
    value: "Save 20+ hours/week",
  },
  {
    id: "solution-2",
    matchId: "challenge-2",
    icon: Target,
    text: "Smart AI targeting finds ideal customers",
    value: "40% lower ad costs",
  },
  {
    id: "solution-3",
    matchId: "challenge-3",
    icon: MessageSquare,
    text: "WhatsApp automation responds instantly",
    value: "Zero leads lost",
  },
  {
    id: "solution-4",
    matchId: "challenge-4",
    icon: BarChart3,
    text: "Real-time analytics dashboard",
    value: "Data-driven decisions",
  },
  {
    id: "solution-5",
    matchId: "challenge-5",
    icon: Brain,
    text: "AI generates stunning ad creatives",
    value: "Professional designs instantly",
  },
];

interface Match {
  challengeId: string;
  solutionId: string;
  isCorrect: boolean;
}

const ValueProposition = () => {
  const [selectedChallenge, setSelectedChallenge] = useState<string | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [wrongAttempt, setWrongAttempt] = useState<string | null>(null);
  const [showHint, setShowHint] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [score, setScore] = useState(0);
  const [attempts, setAttempts] = useState(0);
  
  // Shuffle solutions for display - only reshuffles on reset
  const [shuffledSolutions, setShuffledSolutions] = useState(() => 
    [...socioviaSolutions].sort(() => Math.random() - 0.5)
  );

  const correctMatches = matches.filter(m => m.isCorrect).length;
  const progressPercentage = (correctMatches / businessChallenges.length) * 100;

  useEffect(() => {
    if (correctMatches === businessChallenges.length) {
      setTimeout(() => setIsComplete(true), 800);
    }
  }, [correctMatches]);

  const handleChallengeClick = (challengeId: string) => {
    // Check if already matched
    if (matches.some(m => m.challengeId === challengeId && m.isCorrect)) return;
    setSelectedChallenge(challengeId);
    setShowHint(null);
  };

  const handleSolutionClick = (solutionId: string) => {
    if (!selectedChallenge) return;
    
    // Check if solution already matched
    if (matches.some(m => m.solutionId === solutionId && m.isCorrect)) return;
    
    const solution = socioviaSolutions.find(s => s.id === solutionId);
    const isCorrect = solution?.matchId === selectedChallenge;
    
    setAttempts(prev => prev + 1);
    
    if (isCorrect) {
      setMatches(prev => [...prev, { 
        challengeId: selectedChallenge, 
        solutionId, 
        isCorrect: true 
      }]);
      setScore(prev => prev + 20);
      setSelectedChallenge(null);
    } else {
      setWrongAttempt(solutionId);
      setTimeout(() => setWrongAttempt(null), 600);
      setScore(prev => Math.max(0, prev - 5));
    }
  };

  const handleShowHint = (challengeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHint(showHint === challengeId ? null : challengeId);
  };

  const resetGame = () => {
    setSelectedChallenge(null);
    setMatches([]);
    setWrongAttempt(null);
    setShowHint(null);
    setIsComplete(false);
    setScore(0);
    setAttempts(0);
    // Shuffle solutions on reset
    setShuffledSolutions([...socioviaSolutions].sort(() => Math.random() - 0.5));
  };

  const isChallengeMatched = (challengeId: string) => 
    matches.some(m => m.challengeId === challengeId && m.isCorrect);
  
  const isSolutionMatched = (solutionId: string) => 
    matches.some(m => m.solutionId === solutionId && m.isCorrect);

  const getMatchedSolution = (challengeId: string) => {
    const match = matches.find(m => m.challengeId === challengeId && m.isCorrect);
    if (match) {
      return socioviaSolutions.find(s => s.id === match.solutionId);
    }
    return null;
  };

  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-emerald-50/30 via-white to-emerald-50/20 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-green-100/30 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
      
      <div className="max-w-6xl mx-auto relative">
        <AnimatePresence mode="wait">
          {!isComplete ? (
            <motion.div
              key="game"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Section Header */}
              <motion.div 
                className="text-center mb-10"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 mb-6">
                  <Lightbulb className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600">Business Challenge</span>
                </div>
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
                  Can You Solve These 
                  <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent"> Marketing Problems?</span>
                </h2>
                <p className="text-base md:text-lg text-gray-600 max-w-2xl mx-auto mb-6">
                  Match each business challenge with the right solution. Use your marketing knowledge!
                </p>
                
                {/* Game Stats */}
                <div className="flex items-center justify-center gap-6 mb-4">
                  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-bold text-gray-700">Score: {score}</span>
                  </div>
                  <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
                    <Target className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-gray-700">{correctMatches}/{businessChallenges.length} Matched</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="max-w-md mx-auto">
                  <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </motion.div>

              {/* Game Board */}
              <div className="grid md:grid-cols-2 gap-6 md:gap-10 lg:gap-16">
                {/* Left Side - Challenges */}
                <div>
                  <div className="text-center mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-sm font-semibold">
                      <AlertTriangle className="w-4 h-4" />
                      Business Challenges
                    </span>
                  </div>
                  <div className="space-y-3">
                    {businessChallenges.map((challenge, index) => {
                      const isMatched = isChallengeMatched(challenge.id);
                      const matchedSolution = getMatchedSolution(challenge.id);
                      const isSelected = selectedChallenge === challenge.id;
                      
                      return (
                        <motion.div
                          key={challenge.id}
                          initial={{ opacity: 0, x: -30 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => !isMatched && handleChallengeClick(challenge.id)}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
                            isMatched 
                              ? "bg-emerald-50 border-emerald-300 cursor-default" 
                              : isSelected
                                ? "bg-indigo-50 border-indigo-400 shadow-lg shadow-indigo-500/20 scale-[1.02]"
                                : "bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isMatched 
                                ? "bg-emerald-100" 
                                : isSelected 
                                  ? "bg-indigo-100" 
                                  : "bg-red-50"
                            }`}>
                              {isMatched ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : (
                                <challenge.icon className={`w-5 h-5 ${isSelected ? "text-indigo-600" : "text-red-500"}`} />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium ${isMatched ? "text-emerald-700" : "text-gray-800"}`}>
                                {challenge.text}
                              </p>
                              {isMatched && matchedSolution && (
                                <motion.p 
                                  className="text-sm text-emerald-600 mt-1 flex items-center gap-1"
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                >
                                  <ArrowRight className="w-3 h-3" />
                                  {matchedSolution.text}
                                </motion.p>
                              )}
                              {/* Hint */}
                              <AnimatePresence>
                                {showHint === challenge.id && !isMatched && (
                                  <motion.p
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="text-sm text-amber-600 mt-2 italic"
                                  >
                                    💡 {challenge.hint}
                                  </motion.p>
                                )}
                              </AnimatePresence>
                            </div>
                            {!isMatched && (
                              <button
                                onClick={(e) => handleShowHint(challenge.id, e)}
                                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                                title="Get hint"
                              >
                                <HelpCircle className="w-4 h-4 text-gray-400" />
                              </button>
                            )}
                          </div>
                          {isSelected && (
                            <motion.div
                              className="absolute -right-2 top-1/2 -translate-y-1/2"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            >
                              <div className="w-4 h-4 bg-indigo-500 rounded-full animate-pulse" />
                            </motion.div>
                          )}
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Right Side - Solutions */}
                <div>
                  <div className="text-center mb-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-sm font-semibold">
                      <Sparkles className="w-4 h-4" />
                      Sociovia Solutions
                    </span>
                  </div>
                  <div className="space-y-3">
                    {shuffledSolutions.map((solution, index) => {
                      const isMatched = isSolutionMatched(solution.id);
                      const isWrong = wrongAttempt === solution.id;
                      
                      return (
                        <motion.div
                          key={solution.id}
                          initial={{ opacity: 0, x: 30 }}
                          animate={{ 
                            opacity: 1, 
                            x: 0,
                            scale: isWrong ? [1, 1.05, 0.95, 1] : 1,
                          }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => handleSolutionClick(solution.id)}
                          className={`relative p-4 rounded-xl border-2 transition-all duration-300 ${
                            isMatched 
                              ? "bg-emerald-50 border-emerald-300 cursor-default opacity-60" 
                              : isWrong
                                ? "bg-red-50 border-red-400 shake"
                                : selectedChallenge
                                  ? "bg-white border-gray-200 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-500/20 cursor-pointer hover:scale-[1.02]"
                                  : "bg-gray-50 border-gray-200 cursor-not-allowed opacity-70"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              isMatched 
                                ? "bg-emerald-100" 
                                : isWrong
                                  ? "bg-red-100"
                                  : "bg-emerald-50"
                            }`}>
                              {isMatched ? (
                                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              ) : isWrong ? (
                                <XCircle className="w-5 h-5 text-red-500" />
                              ) : (
                                <solution.icon className="w-5 h-5 text-emerald-600" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium ${isMatched ? "text-emerald-700" : isWrong ? "text-red-700" : "text-gray-800"}`}>
                                {solution.text}
                              </p>
                              <p className={`text-sm mt-1 ${isMatched ? "text-emerald-500" : "text-gray-500"}`}>
                                {solution.value}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Instructions */}
              {!selectedChallenge && correctMatches === 0 && (
                <motion.div
                  className="text-center mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-100"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  <p className="text-indigo-700 font-medium">
                    👆 Click on a <span className="text-red-600">challenge</span> first, then select the matching <span className="text-emerald-600">solution</span>
                  </p>
                </motion.div>
              )}

              {selectedChallenge && (
                <motion.div
                  className="text-center mt-8 p-4 bg-indigo-50 rounded-xl border border-indigo-200"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <p className="text-indigo-700 font-medium">
                    ✨ Now click on the <span className="text-emerald-600 font-bold">solution</span> that solves this challenge!
                  </p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            /* Completion Screen */
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, type: "spring" }}
            >
              <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 md:p-12 relative overflow-hidden">
                {/* Celebration decorations */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-emerald-400 rounded-full"
                      initial={{ 
                        top: "50%", 
                        left: "50%",
                        scale: 0 
                      }}
                      animate={{ 
                        top: `${Math.random() * 100}%`,
                        left: `${Math.random() * 100}%`,
                        scale: [0, 1, 0],
                        opacity: [0, 1, 0]
                      }}
                      transition={{ 
                        duration: 2,
                        delay: i * 0.1,
                        repeat: Infinity,
                        repeatDelay: 3
                      }}
                    />
                  ))}
                </div>
                
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-green-500/20 rounded-full blur-2xl" />
                
                <div className="relative text-center">
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center shadow-2xl shadow-yellow-500/30"
                  >
                    <Trophy className="w-12 h-12 text-white" />
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h3 className="text-3xl md:text-4xl font-bold text-white mb-2">
                      🎉 Congratulations!
                    </h3>
                    <p className="text-xl text-emerald-400 font-semibold mb-4">
                      You solved all the marketing challenges!
                    </p>
                    <div className="flex items-center justify-center gap-4 mb-8">
                      <div className="px-4 py-2 bg-white/10 rounded-lg">
                        <span className="text-yellow-400 font-bold text-xl">{score}</span>
                        <span className="text-gray-400 text-sm ml-1">points</span>
                      </div>
                      <div className="px-4 py-2 bg-white/10 rounded-lg">
                        <span className="text-emerald-400 font-bold text-xl">{attempts}</span>
                        <span className="text-gray-400 text-sm ml-1">attempts</span>
                      </div>
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-8 max-w-2xl mx-auto"
                  >
                    <h4 className="text-lg font-semibold text-white mb-4">
                      Here's what you discovered:
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
                      {socioviaSolutions.map((solution, index) => (
                        <motion.div
                          key={solution.id}
                          className="flex items-center gap-3 p-3 bg-emerald-500/10 rounded-lg"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.8 + index * 0.1 }}
                        >
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                          <span className="text-sm text-gray-300">{solution.value}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                  
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.2 }}
                  >
                    <p className="text-gray-400 mb-6 text-lg">
                      Ready to solve these challenges for your business?
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <Link to="/signup">
                        <Button
                          size="lg"
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-7 text-lg font-semibold rounded-xl shadow-xl shadow-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-600/40 transition-all duration-300 hover:-translate-y-1"
                        >
                          Start Your Free Trial
                          <ArrowRight className="w-5 h-5 ml-2" />
                        </Button>
                      </Link>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={resetGame}
                        className="border-2 border-emerald-400/50 text-emerald-400 hover:bg-emerald-400/10 hover:border-emerald-400 px-8 py-7 text-lg font-semibold rounded-xl transition-all duration-300"
                      >
                        <RefreshCw className="w-5 h-5 mr-2" />
                        Play Again
                      </Button>
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* CSS for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </section>
  );
};

export default ValueProposition;
