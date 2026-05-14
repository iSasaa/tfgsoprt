import { api, HydrateClient } from "~/trpc/server";
import { CanvasLoader } from "~/features/whiteboard/components/CanvasLoader";
import { notFound } from "next/navigation";

export default async function WhiteboardPage({
    params,
    searchParams
}: {
    params: Promise<{ boardId: string }>;
    searchParams: Promise<{ isSession?: string }>;
}) {
    const { boardId } = await params;
    const { isSession } = await searchParams;

    const board = (isSession === "true")
        ? await api.calendar.getEventDrillById({ id: boardId })
        : await api.board.getById({ id: boardId });

    if (!board) {
        return notFound();
    }

    return (
        <HydrateClient>
            <main className="h-[100dvh] w-screen min-h-[340px] min-w-[490px] overflow-hidden bg-gray-950">
                <CanvasLoader 
                    boardId={boardId} 
                    initialData={board.data} 
                    sport={board.sport || "hockey"} 
                    isSession={isSession === "true"}
                />
            </main>
        </HydrateClient>
    );
}
