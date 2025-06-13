"use client";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { authClient } from "~/utils/auth-client";
import { oryLogout } from "./server-actions";

export default function ActionButtons({ redirectUrl, logoutChallenge } : { redirectUrl: string, logoutChallenge: string | null }) {
  const router = useRouter();
  return (
    <div className="flex w-full items-center justify-center space-x-2">
      <Button className="w-[50%]" variant="outline" onClick={() => router.push(redirectUrl)}>
        No
      </Button>
      <Button className="w-[50%]" variant="destructive" onClick={async () => {
        if (logoutChallenge) {
          await oryLogout(logoutChallenge, true);
        } else {
          await authClient.signOut();
          router.push(redirectUrl);
        }
      }}>
        Yes
      </Button>
    </div>
  );
}