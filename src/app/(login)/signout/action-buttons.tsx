"use client";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { authClient } from "~/utils/auth-client";
import { oryLogout } from "./server-actions";
import { useState } from "react";

export default function ActionButtons({
  redirectUrl,
  logoutChallenge,
}: {
  redirectUrl: string;
  logoutChallenge: string | null;
}) {
  const [buttonsEnabled, setButtonsEnabled] = useState(true);
  const router = useRouter();
  return (
    <div className="flex w-full items-center justify-center space-x-2">
      <Button
        className="w-[50%]"
        variant="outline"
        disabled={!buttonsEnabled}
        onClick={async () => {
          setButtonsEnabled(false);
          if (logoutChallenge) {
            if (typeof window !== "undefined") {
              window.location.href = (await oryLogout(logoutChallenge, false))!;
            }
          } else {
            router.push(redirectUrl);
          }
        }}
      >
        No
      </Button>
      <Button
        className="w-[50%]"
        variant="destructive"
        disabled={!buttonsEnabled}
        onClick={async () => {
          setButtonsEnabled(false);
          await authClient.signOut();
          if (logoutChallenge) {
            if (typeof window !== "undefined") {
              window.location.href = (await oryLogout(logoutChallenge, true))!;
            }
          } else {
            router.push(redirectUrl);
          }
        }}
      >
        Yes
      </Button>
    </div>
  );
}
