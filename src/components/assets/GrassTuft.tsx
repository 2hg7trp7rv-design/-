interface GrassTuftProps {
  className?: string;
}

export default function GrassTuft({ className }: GrassTuftProps) {
  return (
    <svg viewBox="0 0 60 30" className={className} fill="none">
      <path d="M10 30 Q8 12 4 6 Q10 14 12 30Z" fill="#43A047" />
      <path d="M15 30 Q14 8 10 2 Q17 10 18 30Z" fill="#2E7D32" />
      <path d="M22 30 Q22 10 18 4 Q26 12 26 30Z" fill="#66BB6A" />
      <path d="M30 30 Q30 6 26 0 Q34 10 34 30Z" fill="#43A047" />
      <path d="M38 30 Q38 10 34 4 Q42 12 42 30Z" fill="#2E7D32" />
      <path d="M45 30 Q46 8 42 2 Q50 10 48 30Z" fill="#66BB6A" />
      <path d="M52 30 Q54 12 56 6 Q52 14 50 30Z" fill="#43A047" />
    </svg>
  );
}
