"use client";
import { redirect } from "next/navigation";
import { Button } from "~/components/ui/button";
import { noConsent } from "./server-actions";

export default function Buttons({
  giveConsent,
  user,
  challenge,
  audience,
  scopes,
}: {
  giveConsent: (
    code_challenge: string,
    user_jwt: string,
    scopes: string[],
    audience: string[],
  ) => Promise<string>;
  user: string;
  challenge: string;
  audience: string[];
  scopes: string[];
}) {
  return (
    <div className="flex w-full items-center justify-center space-x-2">
      <Button className="flex w-[50%]" variant={"destructive"} onClick={async (e) => {
        e.preventDefault();
        redirect(await noConsent(challenge));
      }}>
        Cancel
      </Button>
      <Button
        className="flex w-[50%]"
        variant={"default"}
        onClick={async (e) => {
          e.preventDefault();
          redirect(await giveConsent(challenge, user, scopes, audience));
        }}
      >
        Continue
      </Button>
    </div>
  );
}
