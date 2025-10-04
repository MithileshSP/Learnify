// import React from "react";
// import { Trophy, Medal } from "lucide-react";

// const Leaderboard = ({ leaderboard }) => {
//   return (
//     <div className="space-y-6">
//       <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-8 text-white">
//         <h2 className="text-3xl font-bold mb-2">🏆 Leaderboard</h2>
//         <p className="text-white/90">
//           See who’s leading in learning this week!
//         </p>
//       </div>

//       <div className="bg-white rounded-xl shadow-lg overflow-hidden">
//         <table className="w-full text-left">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="px-6 py-3">Rank</th>
//               <th className="px-6 py-3">Name</th>
//               <th className="px-6 py-3">Coins</th>
//               <th className="px-6 py-3">Streak</th>
//             </tr>
//           </thead>
//           <tbody>
//             {leaderboard.map((player, idx) => (
//               <tr
//                 key={idx}
//                 className={`border-t ${
//                   idx < 3 ? "bg-yellow-50" : ""
//                 } hover:bg-gray-50`}
//               >
//                 <td className="px-6 py-4 font-bold flex items-center space-x-2">
//                   {idx === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
//                   {idx === 1 && <Medal className="w-5 h-5 text-gray-400" />}
//                   {idx === 2 && <Medal className="w-5 h-5 text-amber-600" />}
//                   <span>{idx + 1}</span>
//                 </td>
//                 <td className="px-6 py-4">{player.name}</td>
//                 <td className="px-6 py-4 font-semibold text-yellow-600">
//                   {player.coins}
//                 </td>
//                 <td className="px-6 py-4">{player.streak}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default Leaderboard;
