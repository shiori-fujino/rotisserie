//frontend/src/components/seasonal/PumpkinRain.tsx

import { useEffect, useState } from "react";

const pumpkin = "🎃";

interface Drop {
  id: number;
  left: string;
  duration: string;
}

export default function PumpkinRain() {
  const [drops, setDrops] = useState<Drop[]>([]);

  useEffect(() => {
    const d = Array.from({ length: 8 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      duration: `${4 + Math.random() * 3}s`,
    }));
    setDrops(d);
  }, []);

  return (
    <div
      style={{
        pointerEvents: "none",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        zIndex: 9999,
      }}
    >
      {drops.map((drop) => (
        <div
          key={drop.id}
          style={{
            position: "absolute",
            top: "-2rem",
            left: drop.left,
            fontSize: "1.5rem",
            animation: `fall ${drop.duration} linear infinite`,
          }}
        >
          {pumpkin}
        </div>
      ))}
      <style>{`
        @keyframes fall {
          to {
            transform: translateY(110vh);
          }
        }
      `}</style>
    </div>
  );
}
