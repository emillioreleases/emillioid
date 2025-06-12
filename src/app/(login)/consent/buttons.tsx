"use client";
import { redirect, useSearchParams } from "next/navigation";
import { Button } from "~/components/ui/button";

export default function Buttons({ giveConsent }: { giveConsent: (code_challenge?: string) => Promise<string> }) {
  const searchParams = useSearchParams();
  return (
    <div className="flex w-full items-center justify-center space-x-2">
      <Button className="flex w-[50%]" variant={"destructive"}>
        Cancel
      </Button>
      <Button className="flex w-[50%]" variant={"default"} onClick={async (e) => {
        e.preventDefault();
        redirect(await giveConsent(searchParams.get("consent_challenge")!));
      }}>
        Continue
      </Button>
    </div>
  );
}