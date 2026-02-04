

"use client";

import dynamic from "next/dynamic";

const InteractiveCanvas = dynamic(
  () =>
    import("~/components/InteractiveCanvas").then(
      (mod) => mod.InteractiveCanvas,
    ),
  {
    ssr: false,
  },
);

export function CanvasLoader() {
  return <InteractiveCanvas />;
}