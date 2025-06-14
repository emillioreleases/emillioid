"use client";
import { useRouter } from "next/navigation";
import { Button } from "~/components/ui/button";
import { oryLogout } from "./server-actions";
import { useState, useEffect } from "react";
import { api } from "~/trpc/react";

export default function ActionButtons({
  redirectUrl,
  logoutChallenge,
}: {
  redirectUrl: string;
  logoutChallenge: string | null;
}) {
  const [beingProcessed, setBeingProcessed] = useState(false);
  const [beingRouted, setBeingRouted] = useState(false);
  const [buttonsEnabled, setButtonsEnabled] = useState(true);
  const [numberToWait, setNumberToWait] = useState(0);
  const [processed, setProcessed] = useState(0);
  const signout = api.accountManagement.signOut.useQuery(
    logoutChallenge ?? undefined,
    {
      enabled: false,
    },
  );
  const router = useRouter();

  useEffect(() => {
    if (
      !beingProcessed &&
      signout.data &&
      signout.isSuccess &&
      signout.isFetched
    ) {
      if (typeof signout.data.data === "string") {
        setBeingRouted(true);
        setBeingProcessed(true);
        router.push(signout.data.data);
      } else {
        setBeingProcessed(true);
        setNumberToWait(signout.data.data.length);
        setTimeout(() => {
          router.push(redirectUrl);
        }, 5000);
      }
    }
    if (!beingRouted) {
      if (numberToWait === processed && signout.isFetched && signout.isSuccess) {
        setBeingRouted(true);
        router.push(redirectUrl);
      }
    }
  }, [
    beingRouted,
    beingProcessed,
    numberToWait,
    redirectUrl,
    router,
    signout.data,
    signout.isFetched,
    signout.isSuccess,
    processed,
  ]);

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
          await signout.refetch();
        }}
      >
        Yes
      </Button>
      {(signout.isFetched && signout.isSuccess && signout.data &&
        Array.isArray(signout.data)) &&
        signout.data.map((s: string) => (
          <iframe
            key={s}
            src={s}
            onLoad={() => {
              setProcessed(processed + 1);
            }}
            style={{ display: "none" }}
          ></iframe>
        ))}
    </div>
  );
}
