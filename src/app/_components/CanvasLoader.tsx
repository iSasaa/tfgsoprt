// src/app/_components/CanvasLoader.tsx

"use client"; // Aquesta línia el converteix en un Component de Client

import dynamic from "next/dynamic";

// Movem l'import dinàmic que tenies a la pàgina principal aquí dins
const InteractiveCanvas = dynamic(
  () =>
    // AQUESTA ÉS LA LÍNIA CORREGIDA
    import("~/components/InteractiveCanvas").then(
      (mod) => mod.InteractiveCanvas,
    ),
  {
    ssr: false, // Ara sí que podem fer servir aquesta opció aquí
  },
);

// Aquest component simplement retorna el llenç carregat dinàmicament
export function CanvasLoader() {
  return <InteractiveCanvas />;
}