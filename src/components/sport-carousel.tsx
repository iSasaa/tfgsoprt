"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const SPORTS = [
  { name: "Football", src: "/img/pitch_football.png", emoji: "⚽" },
  { name: "Hockey", src: "/img/pitch_hockey.png", emoji: "🏑" },
  { name: "Futsal", src: "/img/pitch_futsal.png", emoji: "🥅" },
  { name: "Basketball", src: "/img/pitch_basketball.png", emoji: "🏀" },
  { name: "Handball", src: "/img/pitch_handball.png", emoji: "🤾" },
];

const INTERVAL = 3000; // ms per slide

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
      {/* Sport label */}
      <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
        <span>{sport.emoji}</span>
        <span>{sport.name}</span>
      </div>

      {/* Slide */}
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

      {/* Dots */}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
        {SPORTS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? "w-5 bg-orange-400" : "w-1.5 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
