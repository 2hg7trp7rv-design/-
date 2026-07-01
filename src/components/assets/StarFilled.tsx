interface StarFilledProps {
  className?: string;
}

export default function StarFilled({ className }: StarFilledProps) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none">
      <path
        d="M20 4L23.5 15.5H36L26 22L29.5 33.5L20 27L10.5 33.5L14 22L4 15.5H16.5L20 4Z"
        fill="#FFD54F"
        stroke="#FF8F00"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
