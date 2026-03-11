

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment */
"use client";

import dynamic from "next/dynamic";

const InteractiveCanvas = dynamic(
  () =>
    import("~/features/whiteboard/components/InteractiveCanvas").then(
      (mod) => mod.InteractiveCanvas,
    ),
  {
    ssr: false,
  },
);

export function CanvasLoader({ boardId, initialData, sport }: { boardId: string; initialData: any; sport: string }) {
  return <InteractiveCanvas boardId={boardId} initialData={initialData} sport={sport} />;
}