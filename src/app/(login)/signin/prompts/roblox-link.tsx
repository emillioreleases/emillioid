"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { W95Font, W95FontBold } from "~/app/fonts";
import { cn } from "~/lib/utils";
import { linkViaTPBloxlink } from "~/utils/server-actions";

export default function RobloxLink() {
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
          <>
            {errors.map((e, i) => (
              <div className={cn("text-red-500 text-left w-full", W95Font.className)} key={i}>
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
                  onClick={async() => {
                    setButtonsEnabled(false);
                    const data = await linkViaTPBloxlink();
                    if (data.status == "error") {
                      setErrors([data.message]);
                    } else {
                      setSuccess(true);
                      router.refresh();
                    }
                    setButtonsEnabled(true);
                  }}
                  disabled={!buttonsEnabled}
                >
                  <div
                    className={
                      "flex h-full w-full flex-col items-start space-x-2 border-r-2 border-b-2 border-r-[#838381] border-b-[#838381] p-3 text-start text-black active:border-r-0 active:border-b-0 " +
                      W95Font.className
                    }
                  >
                    <span className={"text-lg " + W95FontBold.className}>
                      {"Bloxlink (ER USERS)"}
                    </span>
                    <span className="text-sm">
                      Connect your Roblox account to EmillioID
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
            {success && (
              <p className="text-center text-white">
                We successfully linked your Roblox account to your EmillioID account. Please wait.
              </p>
            )}
          </>
      </>
    </>
  );
}
