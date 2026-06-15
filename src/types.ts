export interface Comment {
  id: string;
  username: string;
  text: string;
  likes: number;
  timestamp: string;
  isAiResponse?: boolean;
}

export interface Quiz {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface LearningCard {
  id: string;
  subject: string;
  title: string;
  creator: string;
  hashtags: string[];
  content: string; // Engaging summary/narrative (The short TikTok Hook!)
  detailedTheory?: string; // High-fidelity analytical theory breakdown
  backgroundNotation?: string; // Elegant scientific equation or annotation
  mediaType: 'video_simulation' | 'infographic';
  animationType: 'orbital' | 'timeline' | 'reaction' | 'geometry' | 'matrix' | 'dna_helix';
  quiz: Quiz;
  likes: number;
  bookmarks: number;
  shares: number;
  comments: Comment[];
}

export interface UserStats {
  xp: number;
  streak: number;
  completedQuizzesCount: number;
  subjectMastey: Record<string, number>; // value from 0 to 100
}
