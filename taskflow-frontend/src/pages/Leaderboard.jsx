import { API_URL } from "../utils/api";
import { getToken, getUser } from "../utils/auth";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Medal, Users, ChevronDown } from "lucide-react";
import BadgeDisplay from "../components/common/BadgeDisplay";

const DIVISIONS = ["All", "A", "B", "C"];

const RANK_STYLES = {
  1: { bg: "bg-gradient-to-r from-amber-50 to-yellow-50", border: "border-amber-200", medal: "🥇", shadow: "shadow-amber-100" },
  2: { bg: "bg-gradient-to-r from-slate-50 to-gray-50",   border: "border-slate-300",  medal: "🥈", shadow: "shadow-slate-100" },
  3: { bg: "bg-gradient-to-r from-orange-50 to-amber-50", border: "border-orange-200",  medal: "🥉", shadow: "shadow-orange-100" },
};

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [division, setDivision] = useState("All");
  const [loading, setLoading] = useState(true);
  const [myBadges, setMyBadges] = useState([]);
  const currentUser = getUser();

  useEffect(() => {
    fetchLeaderboard();
    fetchMyBadges();
  }, [division]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/gamification/leaderboard?division=${division}`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setLeaderboard(data.leaderboard);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBadges = async () => {
    try {
      const res = await fetch(`${API_URL}/api/gamification/my-badges`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) setMyBadges(data.badges);
    } catch (err) {
      console.error("Failed to fetch badges:", err);
    }
  };

  const myRank = leaderboard.find((e) => e._id === currentUser?._id);

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* My Badges Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <Trophy size={18} className="text-amber-500" />
          <h2 className="text-lg font-bold text-slate-800">My Badges</h2>
          <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
            {myBadges.length}
          </span>
        </div>
        <BadgeDisplay badges={myBadges} />
      </motion.div>

      {/* Leaderboard Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <Medal size={18} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">Leaderboard</h2>
          </div>

          {/* Division filter */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {DIVISIONS.map((d) => (
              <button
                key={d}
                onClick={() => setDivision(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  division === d
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {d === "All" ? "All Divisions" : `Division ${d}`}
              </button>
            ))}
          </div>
        </div>

        {/* My Rank Quick View */}
        {myRank && (
          <div className="px-5 py-3 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-blue-700">Your Rank:</span>
              <span className="text-2xl font-black text-blue-700">#{myRank.rank}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-blue-600">
              <span>Avg Score: <strong>{myRank.avgScore}</strong></span>
              <span>Tasks: <strong>{myRank.totalSubmissions}</strong></span>
              <span>Badges: <strong>{myRank.badgeCount}</strong></span>
            </div>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Loading leaderboard...</div>
        ) : leaderboard.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            <Users size={32} className="mx-auto mb-2 text-slate-300" />
            No data available yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {leaderboard.map((entry) => {
              const isMe = entry._id === currentUser?._id;
              const rankStyle = RANK_STYLES[entry.rank] || {};

              return (
                <motion.div
                  key={entry._id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: entry.rank * 0.03 }}
                  className={`flex items-center justify-between px-5 py-3 transition-colors ${
                    isMe ? "bg-blue-50/60 border-l-4 border-blue-500" : ""
                  } ${rankStyle.bg || "hover:bg-slate-50"} ${rankStyle.shadow || ""}`}
                >
                  <div className="flex items-center gap-4">
                    {/* Rank */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      entry.rank <= 3
                        ? "text-lg"
                        : "bg-slate-100 text-slate-500"
                    }`}>
                      {entry.rank <= 3 ? rankStyle.medal : `#${entry.rank}`}
                    </div>

                    {/* Name */}
                    <div>
                      <p className={`text-sm font-semibold ${isMe ? "text-blue-800" : "text-slate-800"}`}>
                        {entry.name}
                        {isMe && <span className="ml-2 text-[10px] bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
                      </p>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        {entry.rollNumber && <span>{entry.rollNumber}</span>}
                        <span>Div {entry.division}</span>
                      </div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-5">
                    <div className="text-center">
                      <p className={`text-lg font-bold ${entry.rank <= 3 ? "text-amber-600" : "text-slate-700"}`}>
                        {entry.avgScore > 0 ? `${entry.avgScore} ` : "—"}
                        {entry.avgScore > 0 && <span className="text-xs font-normal text-slate-400">/ 10</span>}
                      </p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Score</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-semibold text-slate-600">{entry.totalSubmissions}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Tasks</p>
                    </div>
                    <div className="text-center hidden sm:block">
                      <p className="text-sm font-semibold text-slate-600">{entry.badgeCount}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Badges</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
