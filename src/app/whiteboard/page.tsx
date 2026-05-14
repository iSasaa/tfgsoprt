import { redirect } from "next/navigation";

export default function WhiteboardIndexPage() {
  redirect("/dashboard/drills");
}