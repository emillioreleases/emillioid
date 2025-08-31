"use client";
import type { Session, User } from "better-auth/types";
import { api } from "~/trpc/react";
import LoginTemplate from "./login-template";
import SSOButtons from "./sso-buttons";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertCircleIcon, UserIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { authClient } from "~/utils/auth-client";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import RobloxLink from "./roblox-link";
import Image from "next/image";

export default function SigningIn({
  login_challenge,
  prompt,
  promptBypass,
  discordDirect,
  clientName,
}: {
  login_challenge: string;
  prompt: string | null;
  promptBypass?: boolean;
  clientName: string;
  discordDirect?: boolean;
  userHasConnectedRobloxAccount?: boolean;
  sessions: {
    session: Session;
    user: User;
  }[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [loginChallenge] = useState(login_challenge);
  const [processed, setProcessed] = useState(false);
  const [buttonsEnabled, setButtonsEnabled] = useState(true);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(prompt);
  const [accountToUse, setAccountToUse] = useState<"discord" | "roblox" | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [sessionsData, setSessionsData] = useState<
    { session: Session; user: User }[] | null
  >(null);
  const router = useRouter();
  const login = api.login.loginUser.useMutation();
  const loginCapable = api.login.canLogin.useQuery(loginChallenge, {
    enabled: false,
  });
  const session = authClient.useSession();
  const [canLoginMessage, setCanLoginMessage] = useState("");

  useEffect(() => {
    if (currentPrompt === "finished" && !processed) {
      if (discordDirect && !accountToUse) {
        setCurrentPrompt("profile_select");
        return;
      }

      setProcessed(true);

      function userRedirect(url: string) {
        if (typeof window !== "undefined") {
          window.location.href = url;
        } else {
          router.push(url);
        }
      }

      void login
        .mutateAsync({
          loginChallenge,
          forceRobloxAccount: !session.data?.user.email.endsWith(
            "@bloxvalschools.com",
          )
            ? accountToUse === "roblox"
            : false,
        })
        .then((res) => userRedirect(res))
        .catch((e: { message: string }) => {
          setError(e.message);
        });
    }
  }, [
    accountToUse,
    currentPrompt,
    discordDirect,
    login,
    loginChallenge,
    processed,
    router,
    session.data,
  ]);

  useEffect(() => {
    if (!loading && !sessionsData) {
      setLoading(true);
      void authClient.multiSession.listDeviceSessions().then((res) => {
        setSessionsData(res.data);
        setLoading(false);
      });
    }
  }, [loading, sessionsData]);

  if (currentPrompt) {
    if (
      promptBypass &&
      currentPrompt !== "finished" &&
      currentPrompt !== "profile_select" &&
      currentPrompt !== "loginError"
    ) {
      if (discordDirect && !accountToUse) {
        setCurrentPrompt("profile_select");
        return <></>;
      } else {
        setCurrentPrompt("finished");
        return <></>;
      }
    }
    switch (currentPrompt) {
      case "login":
        if (session && sessionsData?.length === 0) {
          void authClient.signOut();
        }
        return (
          <LoginTemplate
            title={"Welcome!"}
            description={
              <>
                {"Please login to continue to "}
                <span className="font-bold">{clientName ?? "My Apps"}</span>
              </>
            }
            havePtLinks
          >
            {error ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>
                  Something went wrong during authentication!
                </AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <></>
            )}
            <SSOButtons withBypassRedirect />
          </LoginTemplate>
        );
      case "select_account":
        return (
          <LoginTemplate
            title={"Welcome!"}
            description={
              <>
                {"Please select an account to continue to "}
                <span className="font-bold">{clientName ?? "My Apps"}</span>
              </>
            }
            havePtLinks
          >
            {error ? (
              <Alert variant="destructive">
                <AlertCircleIcon />
                <AlertTitle>
                  Something went wrong during authentication!
                </AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <></>
            )}
            <div className="flex w-full flex-col items-center justify-center space-y-2">
              {sessionsData && !loading ? (
                sessionsData.map((s) => (
                  <Button
                    variant={"outline"}
                    key={s.session.id}
                    className="flex h-fit w-full items-center justify-start !space-x-1 p-3 text-left"
                    onClick={async (e) => {
                      e.preventDefault();
                      setButtonsEnabled(false);
                      await authClient.multiSession.setActive({
                        sessionToken: s.session.token,
                      });
                      session.refetch();
                      void loginCapable.refetch().then((res) => {
                        if (res.data?.verdict) {
                          if (
                            res.data.message === "with_discord_direct" &&
                            !accountToUse
                          ) {
                            setCurrentPrompt("profile_select");
                          } else {
                            setCurrentPrompt("finished");
                          }
                        } else {
                          setCurrentPrompt("loginError");
                          setCanLoginMessage(
                            res.data?.message ?? "Unknown error",
                          );
                        }
                      });
                    }}
                    disabled={!buttonsEnabled}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={s.user.image!} alt={s.user.name} />
                      <AvatarFallback>
                        <UserIcon />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start justify-start">
                      <span className="font-bold">{s.user.name}</span>
                      <span className="text-sm text-gray-400">
                        {s.user.email}
                      </span>
                    </div>
                  </Button>
                ))
              ) : (
                <div className="flex w-full flex-col items-center justify-center space-y-2">
                  Loading
                </div>
              )}
              <Button
                onClick={() => {
                  setButtonsEnabled(false);
                  setCurrentPrompt("login");
                }}
                disabled={!buttonsEnabled}
                variant="default"
                className="flex w-full"
              >
                Login with another account
              </Button>
            </div>
          </LoginTemplate>
        );
      case "loginError":
        switch (canLoginMessage) {
          case "NO_STAFF":
            return (
              <div>
                You cannot use your employee credentials to login to this site.
                Please log out and try again.
              </div>
            );
          case "NO_ROBLOX_ACCOUNT":
            return (
              <RobloxLink
                clientName={clientName ?? "My Apps"}
                challenge={login_challenge}
              />
            );
        }
      case "profile_select":
        if (session.isPending) {
          return <div>Loading...</div>;
        }
        if (!buttonsEnabled) {
          setButtonsEnabled(true);
        }
        if (
          !accountToUse &&
          !session.data?.user.email.endsWith("@accounts.emillio.dev") &&
          (session.data?.user as { connectedRobloxAccount?: string | null })
            ?.connectedRobloxAccount
        ) {
          return (
            <LoginTemplate
              title={"Select your profile"}
              description={
                "Please select the profile you want to use to continue to " +
                clientName
              }
              havePtLinks
            >
              {error ? (
                <Alert variant="destructive">
                  <AlertCircleIcon />
                  <AlertTitle>
                    Something went wrong during authentication!
                  </AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : (
                <></>
              )}

              <div className="flex w-full flex-col items-center justify-center space-y-2">
                <Button
                  variant={"outline"}
                  onClick={() => {
                    setAccountToUse("roblox");
                    setCurrentPrompt("continue");
                  }}
                  className="w-full justify-start px-4 py-7"
                  disabled={!buttonsEnabled}
                >
                  <Image
                    src={"/auth-logos/roblox.svg"}
                    alt={"Roblox"}
                    width={30}
                    height={30}
                  />
                  <div className="flex flex-col items-start justify-start">
                    <span className="font-bold">Roblox</span>
                    <span className="text-xs text-gray-400">
                      Send your Roblox account to this application.
                    </span>
                  </div>
                </Button>
                <Button
                  variant={"outline"}
                  onClick={() => {
                    setAccountToUse("discord");
                    setCurrentPrompt("continue");
                  }}
                  className="w-full justify-start px-4 py-7"
                  disabled={!buttonsEnabled}
                >
                  <Image
                    src={"/auth-logos/discord.svg"}
                    alt={"Discord"}
                    width={30}
                    height={30}
                    style={{ filter: "invert(1)" }}
                  />
                  <div className="flex flex-col items-start justify-start">
                    <span className="font-bold">Discord</span>
                    <span className="text-xs text-gray-400">
                      Send your Discord account to this application.
                    </span>
                  </div>
                </Button>
              </div>
            </LoginTemplate>
          );
        } else {
          setAccountToUse("discord");
          setCurrentPrompt("finished");
        }
      default:
        if (
          currentPrompt !== "finished" &&
          currentPrompt !== "profile_select" &&
          currentPrompt !== "loginError"
        ) {
          void loginCapable.refetch().then((res) => {
            if (res.data?.verdict) {
              if (res.data.message === "with_discord_direct" && !accountToUse) {
                setCurrentPrompt("profile_select");
              } else {
                setCurrentPrompt("finished");
              }
            } else {
              setCurrentPrompt("loginError");
              setCanLoginMessage(res.data?.message ?? "Unknown error");
            }
          });
        }
        break;
    }
  } else {
    if (
      currentPrompt !== "finished" &&
      currentPrompt !== "select_account" &&
      currentPrompt !== "profile_select" &&
      currentPrompt !== "loginError"
    ) {
      void loginCapable.refetch().then((res) => {
        if (res.data?.verdict) {
          if (res.data.message === "with_discord_direct" && !accountToUse) {
            setCurrentPrompt("profile_select");
          } else {
            setCurrentPrompt("finished");
          }
        } else {
          setCurrentPrompt("loginError");
          setCanLoginMessage(res.data?.message ?? "Unknown error");
        }
      });
    }
  }

  if (currentPrompt === "finished") {
    return (
      <LoginTemplate
        title={"Signing in..."}
        description={"Please wait while we sign you in."}
      >
        {error ? (
          <Alert variant="destructive">
            <AlertCircleIcon />
            <AlertTitle>Something went wrong during authentication!</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : (
          <></>
        )}
      </LoginTemplate>
    );
  }
}
