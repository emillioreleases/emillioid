"use client";
import { redirect } from "next/navigation";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";
import { useState } from "react";

export default function Buttons({
  challenge,
}: {
  challenge: string;
}) {
  const [buttonsEnabled, setButtonsEnabled] = useState(true);
  const giveConsent = api.consent.giveConsent.useMutation();
  const noConsent = api.consent.noConsent.useMutation();

  return (<>
    {giveConsent.error?.message && (
      <span>Something went wrong! {giveConsent.error.message}</span>
    )}
    {noConsent.error?.message && (
      <span>Something went wrong! {noConsent.error.message}</span>
    )}
    <div className="flex w-full items-center justify-center space-x-2">
      <Button className="flex w-[50%]" variant={"destructive"} disabled={!buttonsEnabled} onClick={async (e) => {
        e.preventDefault();
        setButtonsEnabled(false);
        redirect(await noConsent.mutateAsync(challenge));
      }}>
        Cancel
      </Button>
      <Button
        className="flex w-[50%]"
        variant={"default"}
        disabled={!buttonsEnabled}
        onClick={async (e) => {
          e.preventDefault();
          setButtonsEnabled(false);
          redirect(await giveConsent.mutateAsync(challenge));
        }}
      >
        Continue
      </Button>
    </div>
    </>
  );
}
