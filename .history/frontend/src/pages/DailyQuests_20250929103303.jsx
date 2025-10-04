import { useState } from "react";
import { Coins, CheckCircle } from "lucide-react";

// Quest Card Component
function QuestCard({ quest, onStart }) {
  return (
    <div
      className={`bg-white rounded-xl p-6 shadow-lg border-2 transition-all ${
        quest.completed
          ? "border-green-300 bg-green-50"
          : "border-gray-200 hover:border-blue-300 hover:shadow-xl"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">{quest.icon}</span>
            <h3 className="text-lg font-bold">{quest.title}</h3>
          </div>
          <span
            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
              quest.difficulty === "Easy"
                ? "bg-green-100 text-green-700"
                : quest.difficulty === "Medium"
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
            }`}
          >
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
          onClick={() => onStart(quest)}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-2 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition-all"
        >
          Start Quest
        </button>
      )}
    </div>
  );
}

// Quest Modal Component
function QuestModal({ quest, onClose, onSubmit }) {
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState("");

  const handleSubmit = async () => {
    if (!answer.trim()) return;
    const isCorrect =
      answer.toLowerCase().trim() === quest.answer.toLowerCase().trim();

    if (isCorrect) {
      setFeedback(`🎉 Correct! You earned ${quest.coins} coins!`);
      await onSubmit(quest.id);
      setTimeout(() => {
        onClose();
        setAnswer("");
        setFeedback("");
      }, 2000);
    } else {
      setFeedback("❌ Not quite right. Try again!");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-8 max-w-2xl w-full">
        <div className="flex items-center space-x-2 mb-4">
          <span className="text-3xl">{quest.icon}</span>
          <h3 className="text-2xl font-bold">{quest.title}</h3>
        </div>
        <p className="text-lg text-gray-700 mb-6">{quest.question}</p>

        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer..."
          className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 mb-4 focus:outline-none focus:border-blue-500"
          onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
        />

        {feedback && (
          <div
            className={`p-4 rounded-lg mb-4 ${
              feedback.includes("Correct")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {feedback}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            onClick={handleSubmit}
            className="flex-1 bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-lg font-semibold hover:from-green-600 hover:to-teal-600"
          >
            Submit Answer
          </button>
          <button
            onClick={onClose}
            className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// Main DailyQuests Component
export default function DailyQuests({ quests, onCompleteQuest }) {
  const [selectedQuest, setSelectedQuest] = useState(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Daily Learning Quests ⚡</h2>
        <p className="text-white/90">
          Complete challenges to earn Skill Coins and level up
        </p>
      </div>

      {/* Quests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quests.map((quest) => (
          <QuestCard key={quest.id} quest={quest} onStart={setSelectedQuest} />
        ))}
      </div>

      {/* Modal */}
      {selectedQuest && (
        <QuestModal
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
          onSubmit={onCompleteQuest}
        />
      )}
    </div>
  );
}
