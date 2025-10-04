import React, { useState } from 'react';
import { Clock, Vote } from 'lucide-react';

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

export default CampusPulse;