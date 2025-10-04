import React from 'react';
import { CheckCircle, Clock } from 'lucide-react';

const DailyQuests = ({ quests, completeQuest }) => {
  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">🌟 Daily Quests</h2>
        <p className="text-white/90">Complete tasks and earn rewards today!</p>
      </div>

      <div className="space-y-4">
        {quests.map((quest, idx) => (
          <div
            key={idx}
            className={`p-6 rounded-xl shadow-lg flex justify-between items-center transition-all ${
              quest.completed ? 'bg-gray-100 border-l-4 border-green-500' : 'bg-white'
            }`}
          >
            <div>
              <h3 className="text-lg font-semibold">{quest.title}</h3>
              <p className="text-gray-500">{quest.description}</p>
              <p className="text-sm text-gray-400 flex items-center mt-1">
                <Clock className="w-4 h-4 mr-1" /> {quest.time}
              </p>
            </div>
            <button
              onClick={() => completeQuest(idx)}
              disabled={quest.completed}
              className={`flex items-center px-4 py-2 rounded-lg font-semibold transition-all ${
                quest.completed
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
              }`}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              {quest.completed ? 'Completed' : 'Complete'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DailyQuests;
