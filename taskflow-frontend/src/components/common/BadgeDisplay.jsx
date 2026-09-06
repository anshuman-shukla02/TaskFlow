import { motion } from "framer-motion";

/**
 * BadgeDisplay — Renders a collection of earned badges with animations.
 *
 * Props:
 *   badges  — array of badge objects { type, name, icon, description, awardedAt }
 *   compact — optional, use smaller layout
 */

const BADGE_STYLES = {
  FIRST_SUBMISSION:   { bg: "bg-amber-50",   border: "border-amber-200",  text: "text-amber-700" },
  STREAK_7:           { bg: "bg-orange-50",  border: "border-orange-200", text: "text-orange-700" },
  PERFECT_SCORE:      { bg: "bg-yellow-50",  border: "border-yellow-200", text: "text-yellow-700" },
  ALL_TASKS_COMPLETE: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700" },
  TOP_PERFORMER:      { bg: "bg-blue-50",    border: "border-blue-200",   text: "text-blue-700" },
  FAST_LEARNER:       { bg: "bg-violet-50",  border: "border-violet-200", text: "text-violet-700" },
  AI_ACHIEVER:        { bg: "bg-purple-50",  border: "border-purple-200", text: "text-purple-700" },
  ADAPTIVE_MASTER:    { bg: "bg-indigo-50",  border: "border-indigo-200", text: "text-indigo-700" },
};

const DEFAULT_STYLE = { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-700" };

export default function BadgeDisplay({ badges = [], compact = false }) {
  if (badges.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-slate-400">
        No badges earned yet. Keep going! 💪
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? "" : "gap-3"}`}>
      {badges.map((badge, i) => {
        const style = BADGE_STYLES[badge.type] || DEFAULT_STYLE;
        return (
          <motion.div
            key={badge._id || badge.type}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.08, type: "spring", stiffness: 300 }}
            className={`group relative ${style.bg} ${style.border} border rounded-xl ${
              compact ? "px-2.5 py-1.5" : "px-3 py-2"
            } flex items-center gap-2 cursor-default hover:shadow-md transition-shadow`}
            title={badge.description || badge.type}
          >
            {/* Icon */}
            <span className={`${compact ? "text-base" : "text-lg"} group-hover:scale-110 transition-transform`}>
              {badge.icon || "🏅"}
            </span>

            {/* Name */}
            <div>
              <p className={`font-bold ${style.text} ${compact ? "text-[10px]" : "text-xs"} leading-tight`}>
                {badge.name || badge.type.replace(/_/g, " ")}
              </p>
              {!compact && (
                <p className="text-[10px] text-slate-400 leading-tight">
                  {badge.description}
                </p>
              )}
            </div>

            {/* Glow effect on hover */}
            <div className={`absolute inset-0 rounded-xl opacity-0 group-hover:opacity-20 ${style.bg} transition-opacity pointer-events-none`} />
          </motion.div>
        );
      })}
    </div>
  );
}
