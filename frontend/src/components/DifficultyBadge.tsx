import React from 'react';

interface DifficultyBadgeProps {
  difficulty: 'Easy' | 'Medium' | 'Hard' | string;
}

export default function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const diff = difficulty.trim().toLowerCase();
  
  if (diff === 'easy') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/5 border border-emerald-500/10 text-emerald-400">
        Easy
      </span>
    );
  } else if (diff === 'hard') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/5 border border-red-500/10 text-red-400">
        Hard
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/5 border border-amber-500/10 text-amber-400">
        Medium
      </span>
    );
  }
}
