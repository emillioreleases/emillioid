"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export default function RobloxLink({ clientName }: { clientName: string }) {
  const router = useRouter();
  const [area, setArea] = useState<"select" | "selectThirdParty">("select");
  const [buttonsEnabled, setButtonsEnabled] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [success, setSuccess] = useState<boolean>(false);

  const bloxlinkLink =
    api.accountManagement.linkAccountViaBloxlink.useMutation();

  useEffect(() => {
    setErrors([]);
    const int: string[] = [];
    if (bloxlinkLink.isError) {
      int.push(bloxlinkLink.error.message);
    }
    setErrors(int);
  }, [bloxlinkLink.error?.message, bloxlinkLink.isError]);

  useEffect(() => {
    if (bloxlinkLink.isPending) {
      setButtonsEnabled(false);
    } else {
      setButtonsEnabled(true);
    }
  }, [bloxlinkLink.isPending]);

  useEffect(() => {
    if (bloxlinkLink.isSuccess) {
      setSuccess(true);
    }
  }, [bloxlinkLink.isSuccess]);

  if (success) {
    router.refresh();
  }

  return (
    <>
      <header className="justify-left mx-[-1rem] mt-[-1.5rem] mb-[-1.5rem] flex min-w-full items-stretch space-x-2 p-4">
        <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
      </header>
      <main className="justify-left mb-12 flex w-full flex-col items-center space-y-4 sm:mb-5 sm:h-fit">
        <div className="flex w-full flex-col items-start justify-center">
          <h1 className="text-2xl font-bold text-white">
            Connect your Roblox account.
          </h1>
          <h5 className="text-sm text-gray-400">
            In order to access{" "}
            <span className="font-bold">{clientName ?? "My Apps"}</span>
            {
              ", you must link your Roblox account to your myBCPS account. Select a method to link your account by clicking on it."
            }
          </h5>
        </div>
        {!bloxlinkLink.isPending ? (
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
                      className="flex grow flex-col justify-start rounded-lg border border-gray-900 bg-gray-950 p-6 text-left"
                      onClick={() => setArea("selectThirdParty")}
                      disabled={!buttonsEnabled}
                    >
                      <span className="text-lg font-bold">{"Third-Party"}</span>
                      <span className="text-sm text-gray-400">
                        Use your Bloxlink, Rover, or RoWifi identity to link
                        your account.
                      </span>
                    </button>
                  </div>
                )}
                {area === "selectThirdParty" && (
                  <div className="flex w-full flex-col space-y-2 text-left">
                    <button
                      className="flex grow flex-col justify-start rounded-lg border border-gray-900 bg-gray-950 p-6 text-left"
                      onClick={() => bloxlinkLink.mutate()}
                      disabled={!buttonsEnabled}
                    >
                      <span className="text-lg font-bold">
                        {"Bloxlink (BCPS USERS)"}
                      </span>
                      <span className="text-sm text-gray-400">
                        Connect your Roblox account to myBCPS
                      </span>
                    </button>
                  </div>
                )}
                {area !== "select" && (
                  <Button
                    className="flex w-full"
                    variant="outline"
                    onClick={() => setArea("select")}
                    disabled={!buttonsEnabled}
                  >
                    Go Back
                  </Button>
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
        ) : (
          <>{"Please wait while we link your account..."}</>
        )}
      </main>
    </>
  );
}
