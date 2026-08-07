"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "~/trpc/react";
import LoginTemplate from "../login-template";
import { W95Font, W95FontBold } from "~/app/fonts";
import { cn } from "~/lib/utils";

export default function RobloxLink({
  clientName,
  challenge,
}: {
  clientName: string;
  challenge: string;
}) {
  const router = useRouter();
  const [area, setArea] = useState<"select" | "selectThirdParty">("select");
  const [buttonsEnabled, setButtonsEnabled] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<boolean>(false);

  return (
    <>
      <p className={cn("text-sm text-black", W95Font.className)}>
        This proccess will require you to link your Roblox account to your EmillioID account.
      </p>
      <>
        {!success ? (
          <>
            {errors.map((e, i) => (
              <div className="text-red-500" key={i}>
                {e}
              </div>
            ))}
            {area === "select" && (
              <div className="flex w-full flex-col space-y-2 text-left">
                                <button
                  className="flex w-full border-t-2 border-r-2 border-b-2 border-l-2 border-t-white border-r-black border-b-black border-l-white bg-[#c3c3c3] active:border-t-4 active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
                  onClick={() => setArea("selectThirdParty")}
                  disabled={!buttonsEnabled}
                >
                  <div
                    className={
                      "flex h-full w-full flex-col items-start space-x-2 border-r-2 border-b-2 border-r-[#838381] border-b-[#838381] p-3 text-start text-black active:border-r-0 active:border-b-0 " +
                      W95Font.className
                    }
                  >
                    <span className={"text-lg " + W95FontBold.className}>
                      {"Login with Roblox"}
                    </span>
                    <span className="text-sm">
                      Log in with your Roblox account to link it to your EmillioID account.
                    </span>
                  </div>
                </button>
                <button
                  className="flex w-full border-t-2 border-r-2 border-b-2 border-l-2 border-t-white border-r-black border-b-black border-l-white bg-[#c3c3c3] active:border-t-4 active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
                  onClick={() => setArea("selectThirdParty")}
                  disabled={!buttonsEnabled}
                >
                  <div
                    className={
                      "flex h-full w-full flex-col items-start space-x-2 border-r-2 border-b-2 border-r-[#838381] border-b-[#838381] p-3 text-start text-black active:border-r-0 active:border-b-0 " +
                      W95Font.className
                    }
                  >
                    <span className={"text-lg " + W95FontBold.className}>
                      {"Third-Party"}
                    </span>
                    <span className="text-sm">
                      Use your Bloxlink, Rover, or RoWifi identity to link
                      your account.
                    </span>
                  </div>
                </button>
              </div>
            )}
            {area === "selectThirdParty" && (
              <div className="flex w-full flex-col space-y-2 text-left">
                <button
                  className="flex w-full border-t-2 border-r-2 border-b-2 border-l-2 border-t-white border-r-black border-b-black border-l-white bg-[#c3c3c3] active:border-t-4 active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
                  onClick={() => { }}
                  disabled={!buttonsEnabled}
                >
                  <div
                    className={
                      "flex h-full w-full flex-col items-start space-x-2 border-r-2 border-b-2 border-r-[#838381] border-b-[#838381] p-3 text-start text-black active:border-r-0 active:border-b-0 " +
                      W95Font.className
                    }
                  >
                    <span className={"text-lg " + W95FontBold.className}>
                      {"Bloxlink (BCPS USERS)"}
                    </span>
                    <span className="text-sm">
                      Connect your Roblox account to myBCPS
                    </span>
                  </div>
                </button>
              </div>
            )}
            {area !== "select" && (
              <button
                className="flex w-full border-t-2 border-r-2 border-b-2 border-l-2 border-t-white border-r-black border-b-black border-l-white bg-[#c3c3c3] active:border-t-4 active:border-t-black active:border-r-white active:border-b-white active:border-l-black"
                onClick={() => setArea("select")}
                disabled={!buttonsEnabled}
              >
                <div
                  className={
                    "flex h-full w-full flex-col items-center space-x-2 border-r-2 border-b-2 border-r-[#838381] border-b-[#838381] p-1 text-center text-black active:border-r-0 active:border-b-0 " +
                    W95Font.className
                  }
                >
                  Go Back
                </div>
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex w-full flex-col items-center justify-center space-y-4 sm:h-fit">
              <div className="flex flex-col items-center justify-center">
                <h1 className="text-2xl font-bold text-white">
                  Linking your account...
                </h1>
                <h5 className="text-sm text-gray-400">
                  Please wait while we link your account.
                </h5>
              </div>
              <div className="flex w-full flex-col space-y-2 text-left">
                <div className="flex w-full flex-col items-center justify-center space-y-2">
                  <div className="h-auto w-[0.1px] border-[0.05px] border-white" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={"/auth-logos/roblox.svg"} alt={"Logo"} />
                </div>
              </div>
            </div>
          </>
        )}
      </>
    </>
  );
}
