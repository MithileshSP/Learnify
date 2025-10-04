import React, { useState, useEffect } from 'react';
import { Trophy, Coins, Target, MessageSquare, Vote, User, BookOpen, Award, TrendingUp, Zap, CheckCircle, Clock } from 'lucide-react';

const API_URL = 'http://localhost:8080/api';

// Navigation Component
const Navigation = ({ activeTab, setActiveTab, user }) => {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Target },
    { id: 'quests', label: 'Daily Quests', icon: Zap },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'ai-buddy', label: 'AI Buddy', icon: MessageSquare },
    { id: 'campus-pulse', label: 'Campus Pulse', icon: Vote }
  ];

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between py-4">
          <div className="flex items-center space-x-2">
            <BookOpen className="w-8 h-8" />
            <span className="text-2xl font-bold">LearnOnline</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-full">
              <Coins className="w-5 h-5 text-yellow-300" />
              <span className="font-semibold">{user.coins}</span>
            </div>
            <div className="flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>{user.name}</span>
            </div>
          </div>
        </div>
        <div className="flex space-x-1 pb-2">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-t-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 font-semibold'
                    : 'text-white/80 hover:bg-white/10'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = ({ user, stats }) => {
  const progressPercentage = (stats.completedQuests / stats.totalQuests) * 100 || 0;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome back, {user.name}! 🎓</h2>
        <p className="text-white/90">Keep up the great work on your learning journey</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-orange-100 p-3 rounded-lg">
              <Zap className="w-8 h-8 text-orange-500" />
            </div>
            <span className="text-3xl font-bold text-orange-500">{stats.streak}</span>
          </div>
          <h3 className="text-gray-600 font-semibold">Day Streak</h3>
          <p className="text-sm text-gray-500 mt-1">Keep learning daily!</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <Target className="w-8 h-8 text-blue-500" />
            </div>
            <span className="text-3xl font-bold text-blue-500">{stats.completedQuests}</span>
          </div>
          <h3 className="text-gray-600 font-semibold">Quests Completed</h3>
          <p className="text-sm text-gray-500 mt-1">Out of {stats.totalQuests} today</p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-yellow-200">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-yellow-100 p-3 rounded-lg">
              <Coins className="w-8 h-8 text-yellow-500" />
            </div>
            <span className="text-3xl font-bold text-yellow-500">{user.coins}</span>
          </div>
          <h3 className="text-gray-600 font-semibold">Skill Coins</h3>
          <p className="text-sm text-gray-500 mt-1">Earn more by learning</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <TrendingUp className="w-6 h-6 mr-2 text-green-500" />
          Today's Progress
        </h3>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-2">
          <div
            className="bg-gradient-to-r from-green-400 to-blue-500 h-4 rounded-full transition-all duration-500"
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600">
          {stats.completedQuests} of {stats.totalQuests} quests completed ({Math.round(progressPercentage)}%)
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center">
          <Award className="w-6 h-6 mr-2 text-purple-500" />
          Recent Achievements
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.badges.map((badge, idx) => (
            <div key={idx} className="flex flex-col items-center p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg">
              <div className="text-4xl mb-2">{badge.icon}</div>
              <span className="text-sm font-semibold text-center">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Daily Quests Component
const DailyQuests = ({ quests, onCompleteQuest, user }) => {
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');

  const handleSubmit = async (quest) => {
    if (!answer.trim()) return;

    const isCorrect = answer.toLowerCase().trim() === quest.answer.toLowerCase().trim();
    
    if (isCorrect) {
      setFeedback('🎉 Correct! You earned ' + quest.coins + ' coins!');
      await onCompleteQuest(quest.id);
      setTimeout(() => {
        setSelectedQuest(null);
        setAnswer('');
        setFeedback('');
      }, 2000);
    } else {
      setFeedback('❌ Not quite right. Try again!');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Daily Learning Quests ⚡</h2>
        <p className="text-white/90">Complete challenges to earn Skill Coins and level up</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quests.map(quest => (
          <div
            key={quest.id}
            className={`bg-white rounded-xl p-6 shadow-lg border-2 transition-all ${
              quest.completed
                ? 'border-green-300 bg-green-50'
                : 'border-gray-200 hover:border-blue-300 hover:shadow-xl'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-2xl">{quest.icon}</span>
                  <h3 className="text-lg font-bold">{quest.title}</h3>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                  quest.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                  quest.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {quest.difficulty}
                </span>
              </div>
              <div className="flex items-center space-x-1 bg-yellow-100 px-3 py-1 rounded-full">
                <Coins className="w-4 h-4 text-yellow-600" />
                <span className="font-bold text-yellow-600">+{quest.coins}</span>
              </div>
            </div>

            <p className="text-gray-700 mb-4">{quest.question}</p>

            {quest.completed ? (
              <div className="flex items-center space-x-2 text-green-600 font-semibold">
                <CheckCircle className="w-5 h-5" />
                <span>Completed!</span>
              </div>
            ) : (
              <button
                onClick={() => setSelectedQuest(quest)}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
              >
                Start Quest
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedQuest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
            <div className="flex items-center space-x-2 mb-4">
              <span className="text-3xl">{selectedQuest.icon}</span>
              <h3 className="text-2xl font-bold">{selectedQuest.title}</h3>
            </div>
            <p className="text-lg text-gray-700 mb-6">{selectedQuest.question}</p>
            
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Type your answer..."
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(selectedQuest)}
            />

            {feedback && (
              <div className={`p-4 rounded-lg mb-4 ${
                feedback.includes('Correct') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {feedback}
              </div>
            )}

            <div className="flex space-x-4">
              <button
                onClick={() => handleSubmit(selectedQuest)}
                className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-teal-600"
              >
                Submit Answer
              </button>
              <button
                onClick={() => {
                  setSelectedQuest(null);
                  setAnswer('');
                  setFeedback('');
                }}
                className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Leaderboard Component
const Leaderboard = ({ leaders, currentUser }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">🏆 Leaderboard</h2>
        <p className="text-white/90">Top learners of the week</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
              <tr>
                <th className="px-6 py-4 text-left">Rank</th>
                <th className="px-6 py-4 text-left">Student</th>
                <th className="px-6 py-4 text-center">Quests</th>
                <th className="px-6 py-4 text-center">Streak</th>
                <th className="px-6 py-4 text-right">Coins</th>
              </tr>
            </thead>
            <tbody>
              {leaders.map((leader, idx) => (
                <tr
                  key={leader.id}
                  className={`border-b transition-colors ${
                    leader.id === currentUser.id
                      ? 'bg-blue-50 font-semibold'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {idx === 0 && <span className="text-2xl mr-2">🥇</span>}
                      {idx === 1 && <span className="text-2xl mr-2">🥈</span>}
                      {idx === 2 && <span className="text-2xl mr-2">🥉</span>}
                      <span className="font-bold text-lg">#{idx + 1}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold">
                        {leader.name.charAt(0)}
                      </div>
                      <span>{leader.name}</span>
                      {leader.id === currentUser.id && (
                        <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">You</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold">{leader.completedQuests}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Zap className="w-4 h-4 text-orange-500" />
                      <span className="font-semibold">{leader.streak}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1 font-semibold text-yellow-600">
                      <Coins className="w-5 h-5" />
                      <span>{leader.coins}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// AI Buddy Component
const AIBuddy = () => {
  const [messages, setMessages] = useState([
    { type: 'ai', text: 'Hello! I\'m your AI Buddy Mentor. I\'m here to help you with your studies 24/7. Ask me anything!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setMessages(prev => [...prev, { type: 'user', text: userMessage }]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage })
      });

      const data = await response.json();
      setMessages(prev => [...prev, { type: 'ai', text: data.response }]);
    } catch (error) {
      setMessages(prev => [...prev, { type: 'ai', text: 'Sorry, I had trouble understanding that. Could you rephrase?' }]);
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">🤖 AI Buddy Mentor</h2>
        <p className="text-white/90">Your 24/7 learning companion</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg h-[600px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl p-4 ${
                msg.type === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl p-4">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything about your studies..."
              className="flex-1 border-2 border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={sendMessage}
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Campus Pulse Component
const CampusPulse = ({ polls, onVote }) => {
  const [votedPolls, setVotedPolls] = useState({});

  const handleVote = async (pollId, optionIndex) => {
    await onVote(pollId, optionIndex);
    setVotedPolls(prev => ({ ...prev, [pollId]: optionIndex }));
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">🗳️ Campus Pulse</h2>
        <p className="text-white/90">Your voice matters - vote on campus decisions</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {polls.map(poll => {
          const hasVoted = votedPolls[poll.id] !== undefined;
          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);

          return (
            <div key={poll.id} className="bg-white rounded-xl p-6 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-xl font-bold flex-1">{poll.question}</h3>
                <div className="flex items-center space-x-2 text-gray-500 text-sm">
                  <Clock className="w-4 h-4" />
                  <span>{poll.timeLeft}</span>
                </div>
              </div>

              <div className="space-y-3">
                {poll.options.map((option, idx) => {
                  const percentage = totalVotes > 0 ? (option.votes / totalVotes * 100) : 0;
                  const isSelected = votedPolls[poll.id] === idx;

                  return (
                    <div key={idx}>
                      <button
                        onClick={() => !hasVoted && handleVote(poll.id, idx)}
                        disabled={hasVoted}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : hasVoted
                            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                            : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold">{option.text}</span>
                          {hasVoted && (
                            <span className="text-sm font-bold text-blue-600">
                              {Math.round(percentage)}%
                            </span>
                          )}
                        </div>
                        {hasVoted && (
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              {hasVoted && (
                <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                  <div className="flex items-center space-x-2">
                    <Vote className="w-4 h-4" />
                    <span>{totalVotes} total votes</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Main App
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