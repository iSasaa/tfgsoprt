"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPORTS = [
  { name: "Football", src: "/img/pitch_football.svg", emoji: "⚽" },
  { name: "Hockey", src: "/img/pitch_hockey.svg", emoji: "🏑" },
  { name: "Futsal", src: "/img/pitch_futsal.svg", emoji: "🥅" },
  { name: "Basketball", src: "/img/pitch_basketball.svg", emoji: "🏀" },
  { name: "Handball", src: "/img/pitch_handball.svg", emoji: "🤾" },
];

const INTERVAL = 3000;

export function SportCarousel() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent((c) => (c + 1) % SPORTS.length);
        setAnimating(false);
      }, 300);
    }, INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const sport = SPORTS[current]!;

  return (
    <div className="relative w-full overflow-hidden rounded-lg">
      <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-white/90 border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700 backdrop-blur-sm shadow-sm">
        <span>{sport.emoji}</span>
        <span>{sport.name}</span>
      </div>

      <div
        className="aspect-video w-full transition-opacity duration-300"
        style={{ opacity: animating ? 0 : 1 }}
      >
        <Image
          src={sport.src}
          alt={`${sport.name} pitch`}
          width={640}
          height={360}
          className="h-full w-full object-cover"
          priority
        />
      </div>

      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {SPORTS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? "w-5 bg-blue-500" : "w-1.5 bg-slate-300"
              }`}
          />
        ))}
      </div>
    </div>
  );
}
