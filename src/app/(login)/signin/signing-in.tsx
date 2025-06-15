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

export default function SigningIn({
  login_challenge,
  prompt,
  promptBypass,
  clientName,
  sessions,
}: {
  login_challenge: string;
  prompt: string | null;
  promptBypass: boolean;
  clientName: string;
  sessions: {
    session: Session;
    user: User;
  }[];
}) {
  const [canBypassPrompt] = useState<boolean>(promptBypass);
  const [error, setError] = useState<string | null>(null);
  const [loginChallenge] = useState(login_challenge);
  const [processed, setProcessed] = useState(false);
  const [buttonsEnabled, setButtonsEnabled] = useState(true);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(prompt);
  const router = useRouter();
  const login = api.login.loginUser.useMutation();
  const requestBypass = api.login.requestBypass.useMutation();

  useEffect(() => {
    if (currentPrompt === "finished" && !processed) {
      setProcessed(true);

      function userRedirect(url: string) {
        if (typeof window !== "undefined") {
          window.location.href = url;
        } else {
          router.push(url);
        }
      }

      void login
        .mutateAsync(loginChallenge)
        .then((res) => userRedirect(res))
        .catch((e: { message: string }) => {
          console.log(e);
          setError(e.message);
        });
    }
  }, [currentPrompt, login, loginChallenge, processed, router]);

  console.log(currentPrompt);

  if (currentPrompt && !canBypassPrompt) {
    switch (currentPrompt) {
      case "loginUser":
        return (
          <LoginTemplate
            title={"Welcome!"}
            description={"Please login to continue to " + clientName}
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
            <SSOButtons />
          </LoginTemplate>
        );
      case "login":
        return (
          <LoginTemplate
            title={"Welcome!"}
            description={
              "Please select an account to continue to " + clientName
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
              {sessions.map((s) => (
                <Button
                  variant={"outline"}
                  key={s.session.id}
                  className="flex w-full items-center justify-start !space-x-1 p-3 text-left h-fit"
                  onClick={async (e) => {
                    e.preventDefault();
                    setButtonsEnabled(false);
                    await authClient.multiSession.setActive({
                      sessionToken: s.session.token,
                    });
                    setCurrentPrompt("finished");
                  }}
                  disabled={!buttonsEnabled}
                >
                  <Avatar className="w-8 h-8"> 
                    <AvatarImage src={s.user.image!} alt={s.user.name} />
                    <AvatarFallback><UserIcon /></AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start justify-start">
                    <span className="font-bold">{s.user.name}</span>
                    <span className="text-sm text-gray-400">
                      {s.user.email}
                    </span>
                  </div>
                </Button>
              ))}
              <Button
                onClick={() => {
                  setButtonsEnabled(false);
                  void requestBypass.mutateAsync().then(() => {
                    setCurrentPrompt("loginUser");
                  });
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
      default:
        if (currentPrompt !== "finished") {
          setCurrentPrompt("finished");
        }
        break;
    }
  } else {
    if (currentPrompt !== "finished") {
      setCurrentPrompt("finished");
    }
  }

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
