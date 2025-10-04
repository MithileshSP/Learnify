import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [user, setUser] = useState({
    id: 1,
    name: 'Alex Kumar',
    coins: 250
  });

  const [stats, setStats] = useState({
    streak: 7,
    completedQuests: 0,
    totalQuests: 6,
    badges: [
      { icon: '🔥', name: 'Week Warrior' },
      { icon: '⚡', name: 'Quick Learner' },
      { icon: '🎯', name: 'Goal Getter' },
      { icon: '🌟', name: 'Rising Star' }
    ]
  });

  const [quests, setQuests] = useState([
    {
      id: 1,
      title: 'Math Quiz',
      question: 'What is 15 × 8?',
      answer: '120',
      icon: '🔢',
      difficulty: 'Easy',
      coins: 10,
      completed: false
    },
    {
      id: 2,
      title: 'Science Challenge',
      question: 'What is the chemical symbol for Gold?',
      answer: 'Au',
      icon: '🧪',
      difficulty: 'Medium',
      coins: 20,
      completed: false
    },
    {
      id: 3,
      title: 'History Trivia',
      question: 'In which year did India gain independence?',
      answer: '1947',
      icon: '📚',
      difficulty: 'Easy',
      coins: 10,
      completed: false
    },
    {
      id: 4,
      title: 'Logic Puzzle',
      question: 'If all Bloops are Razzies and all Razzies are Lazzies, are all Bloops definitely Lazzies? (yes/no)',
      answer: 'yes',
      icon: '🧩',
      difficulty: 'Medium',
      coins: 25,
      completed: false
    },
    {
      id: 5,
      title: 'Programming Quest',
      question: 'What does HTML stand for? (abbreviation)',
      answer: 'hypertext markup language',
      icon: '💻',
      difficulty: 'Easy',
      coins: 15,
      completed: false
    },
    {
      id: 6,
      title: 'Geography Challenge',
      question: 'What is the capital of France?',
      answer: 'Paris',
      icon: '🌍',
      difficulty: 'Easy',
      coins: 10,
      completed: false
    }
  ]);

  const [leaders, setLeaders] = useState([
    { id: 1, name: 'Alex Kumar', completedQuests: 0, streak: 7, coins: 250 },
    { id: 2, name: 'Priya Sharma', completedQuests: 18, streak: 12, coins: 480 },
    { id: 3, name: 'Raj Patel', completedQuests: 15, streak: 9, coins: 420 },
    { id: 4, name: 'Ananya Singh', completedQuests: 14, streak: 8, coins: 390 },
    { id: 5, name: 'Vikram Reddy', completedQuests: 12, streak: 6, coins: 360 }
  ]);

  const [polls, setPolls] = useState([
    {
      id: 1,
      question: 'What should be our next cafeteria menu addition?',
      timeLeft: '2 days left',
      options: [
        { text: 'South Indian Thali', votes: 45 },
        { text: 'Mexican Fiesta', votes: 32 },
        { text: 'Mediterranean Bowl', votes: 28 },
        { text: 'Asian Fusion', votes: 25 }
      ]
    },
    {
      id: 2,
      question: 'Which sustainability initiative should we prioritize?',
      timeLeft: '5 days left',
      options: [
        { text: 'Solar Panel Installation', votes: 52 },
        { text: 'Campus Recycling Program', votes: 48 },
        { text: 'Tree Plantation Drive', votes: 38 }
      ]
    }
  ]);

  const handleCompleteQuest = async (questId) => {
    const quest = quests.find(q => q.id === questId);
    if (!quest || quest.completed) return;

    setQuests(prev => prev.map(q => 
      q.id === questId ? { ...q, completed: true } : q
    ));

    setUser(prev => ({ ...prev, coins: prev.coins + quest.coins }));
    
    setStats(prev => ({
      ...prev,
      completedQuests: prev.completedQuests + 1
    }));

    setLeaders(prev => prev.map(l =>
      l.id === user.id
        ? { ...l, completedQuests: l.completedQuests + 1, coins: l.coins + quest.coins }
        : l
    ).sort((a, b) => b.coins - a.coins));
  };

  const handleVote = async (pollId, optionIndex) => {
    setPolls(prev => prev.map(poll =>
      poll.id === pollId
        ? {
            ...poll,
            options: poll.options.map((opt, idx) =>
              idx === optionIndex ? { ...opt, votes: opt.votes + 1 } : opt
            )
          }
        : poll
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
      
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === 'dashboard' && <Dashboard user={user} stats={stats} />}
        {activeTab === 'quests' && <DailyQuests quests={quests} onCompleteQuest={handleCompleteQuest} user={user} />}
        {activeTab === 'leaderboard' && <Leaderboard leaders={leaders} currentUser={user} />}
        {activeTab === 'ai-buddy' && <AIBuddy />}
        {activeTab === 'campus-pulse' && <CampusPulse polls={polls} onVote={handleVote} />}
      </div>
    </div>
  );
}
