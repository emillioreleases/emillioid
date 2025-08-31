"use client";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { W95Font, W95FontBold } from "~/app/fonts";
import { authClient } from "~/utils/auth-client";

export default function SSOButtons({
  withBypassRedirect,
}: {
  withBypassRedirect?: boolean;
}) {
  const [loggingIN, setLoggingIn] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return (
    <div className="flex w-full flex-col items-center justify-center space-y-2">
      <button
        className="flex w-full border-t-2 border-r-2 border-b-2 border-l-2 border-t-white border-r-black border-b-black border-l-white bg-[#c3c3c3] active:border-t-4 active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
        onClick={async (e) => {
          e.preventDefault();
          setLoggingIn(true);
          await authClient.signIn.social({
            provider: "discord",
            callbackURL: !withBypassRedirect
              ? pathname + "?" + searchParams.toString()
              : `/oauth2/login-bypass?flow=${searchParams.get("flow")}`,
          });
        }}
        disabled={loggingIN}
      >
        <div
          className={
            "flex h-full w-full items-center justify-center space-x-2 border-r-2 border-b-2 border-r-[#838381] border-b-[#838381] p-3 text-black active:border-r-0 active:border-b-0 " +
            W95Font.className
          }
        >
          <Image
            src={"/auth-logos/discord.svg"}
            alt={"Discord Logo"}
            width={25}
            height={25}
          />
          <p>
            Login with <span className={W95FontBold.className}>Discord</span>
          </p>
        </div>
      </button>
      <button
        className="flex w-full border-t-2 border-r-2 border-b-2 border-l-2 border-t-white border-r-black border-b-black border-l-white bg-[#c3c3c3] active:border-t-4 active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
        onClick={async (e) => {
          e.preventDefault();
          setLoggingIn(true);
          await authClient.signIn.social({
            provider: "roblox",
            callbackURL: !withBypassRedirect
              ? pathname + "?" + searchParams.toString()
              : `/oauth2/login-bypass?flow=${searchParams.get("flow")}`,
          });
        }}
        disabled={loggingIN}
      >
        <div
          className={
            "flex h-full w-full items-center justify-center space-x-2 border-r-2 border-b-2 border-r-[#838381] border-b-[#838381] p-3 text-black active:border-r-0 active:border-b-0 " +
            W95Font.className
          }
        >
          <Image
            src={"/auth-logos/roblox.svg"}
            alt={"Roblox Logo"}
            width={25}
            height={25}
            style={{
              filter: "invert(1)",
            }}
          />
          <p>
            Login with <span className={W95FontBold.className}>Roblox</span>
          </p>
        </div>
      </button>
    </div>
  );
}
