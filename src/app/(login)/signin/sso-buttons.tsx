"use client";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { authClient } from "~/utils/auth-client";

export default function SSOButtons() {
  const [loggingIN, setLoggingIn] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <div className="flex w-full flex-col items-center justify-center space-y-2">
{/*       <Button
        className="flex w-full p-6"
        variant="outline"
        onClick={async (e) => {
          e.preventDefault();
          setLoggingIn(true);
          await authClient.signIn.social({
            provider: "discord",
            callbackURL: pathname+"?"+searchParams.toString(),
          });
        }}
        disabled={loggingIN}
      >
        <Image
          src={"/auth-logos/discord.svg"}
          alt={"Discord Logo"}
          width={25}
          height={25}
          style={{ filter: "invert(1)" }}
        />
        <p>
          Login with <span className="font-bold">Discord</span>
        </p>
      </Button> */}
      <Button
        className="flex w-full p-6"
        variant="outline"
        onClick={async (e) => {
          e.preventDefault();
          setLoggingIn(true);
          await authClient.signIn.social({
            provider: "roblox",
            callbackURL: pathname+"?"+searchParams.toString(),
          });
        }}
        disabled={loggingIN}
      >
        <Image
          src={"/auth-logos/roblox.svg"}
          alt={"Roblox Logo"}
          width={25}
          height={25}
        />
        <p>
          Login with <span className="font-bold">Roblox</span>
        </p>
      </Button>
      <p className="text-sm text-blue-500 hover:text-blue-400">
        Are you a BCPS Employee?{" "}
        <button
          onClick={async (e) => {
            e.preventDefault();
            setLoggingIn(true);
            await authClient.signIn.social({
              provider: "microsoft",
              callbackURL: pathname+"?"+searchParams.toString(),
            });
          }}
          className="font-semibold underline"
          disabled={loggingIN}
        >
          Click here
        </button>
      </p>
    </div>
  );
}
