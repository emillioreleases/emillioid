import { permanentRedirect, redirect } from "next/navigation";

export function GET() {
  return redirect("/portal");
}
