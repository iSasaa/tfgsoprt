import { CanvasLoader } from "~/app/_components/CanvasLoader";

export default async function WhiteboardPage({
    params,
}: {
    params: Promise<{ boardId: string }>;
}) {
    const { boardId } = await params;

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
            {/* 
          TODO: Pass boardId to CanvasLoader -> InteractiveCanvas 
          to load specific board data 
      */}
            <CanvasLoader />

            <div className="absolute top-4 left-4 bg-black/50 p-2 rounded text-xs text-white/50 pointer-events-none">
                Board ID: {boardId}
            </div>
        </main>
    );
}
