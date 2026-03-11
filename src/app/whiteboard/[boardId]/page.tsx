import { api, HydrateClient } from "~/trpc/server";
import { CanvasLoader } from "~/features/whiteboard/components/CanvasLoader";
import { notFound } from "next/navigation";

export default async function WhiteboardPage({
    params,
}: {
    params: Promise<{ boardId: string }>;
}) {
    const { boardId } = await params;

    // Fetch board data on the server
    const board = await api.board.getById({ id: boardId });

    if (!board) {
        return notFound();
    }

    return (
        <HydrateClient>
            <main className="h-screen w-screen min-h-[340px] min-w-[490px] overflow-hidden">
                <CanvasLoader boardId={boardId} initialData={board.data} sport={board.sport} />
            </main>
        </HydrateClient>
    );
}
