// Звёзды и плывущие сердечки на фоне.
const stars = Array.from({ length: 70 }, (_, i) => ({
  left: (i * 37.7) % 100,
  top: (i * 61.3) % 100,
  size: 1 + ((i * 7) % 3),
  delay: (i * 0.37) % 5,
}));

const hearts = Array.from({ length: 14 }, (_, i) => ({
  left: (i * 23.1 + 5) % 95,
  size: 12 + ((i * 5) % 16),
  duration: 14 + ((i * 3) % 12),
  delay: (i * 1.9) % 18,
}));

export default function Sky() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
      {stars.map((s, i) => (
        <span
          key={`s${i}`}
          className="star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
      {hearts.map((h, i) => (
        <span
          key={`h${i}`}
          className="heart"
          style={{
            left: `${h.left}%`,
            fontSize: h.size,
            animationDuration: `${h.duration}s`,
            animationDelay: `${h.delay}s`,
          }}
        >
          ♥
        </span>
      ))}
    </div>
  );
}
