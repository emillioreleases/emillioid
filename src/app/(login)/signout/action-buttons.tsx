"use client";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { useState } from "react";
import { api } from "~/trpc/react";

export default function ActionButtons({
  logoutChallenge,
}: {
  logoutChallenge: string;
}) {
  const [buttonsEnabled, setButtonsEnabled] = useState(true);
  const noSignOut = api.accountManagement.signOut.useQuery(
    { logout_challenge: logoutChallenge, accepted: false },
    {
      enabled: false,
    },
  );
  const signOut = api.accountManagement.signOut.useQuery(
    { logout_challenge: logoutChallenge, accepted: true },
    {
      enabled: false,
    },
  );
  const router = useRouter();

  return (
    <div className="flex w-full items-center justify-center space-x-2">
      <Button
        className="w-[50%]"
        variant="outline"
        disabled={!buttonsEnabled}
        onClick={async () => {
          setButtonsEnabled(false);
          const signoutData = await noSignOut.refetch();
          if (signoutData.isSuccess) {
            if (typeof window !== "undefined") {
              window.location.href = signoutData.data.data;
            } else {
              router.push(signoutData.data.data);
            }
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
          const signoutData = await signOut.refetch();
          if (signoutData.isSuccess) {
            if (typeof window !== "undefined") {
              window.location.href = signoutData.data.data;
            } else {
              router.push(signoutData.data.data);
            }
          }
        }}
      >
        Yes
      </Button>
    </div>
  );
}
