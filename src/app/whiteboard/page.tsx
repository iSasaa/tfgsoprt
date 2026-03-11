import { auth } from "~/server/auth";
import { redirect } from "next/navigation";
import { api } from "~/trpc/server";

export default async function WhiteboardIndexPage() {
  const session = await auth();
  if (!session) {
    redirect("/api/auth/signin");
  }

  const board = await api.board.create({
    title: "Quick Board",
    sport: "Hockey",
  });

  redirect(`/whiteboard/${board.id}`);
}