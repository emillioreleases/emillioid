"use client";
import Image from "next/image";
import type { Session, User } from "better-auth/types";
import { api } from "~/trpc/react";
import LoginTemplate from "./login-template";
import SSOButtons from "./sso-buttons";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import { authClient } from "~/utils/auth-client";
import { useRouter } from "next/navigation";

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
  const [error, setError] = useState<string | null>(null);
  const [loginChallenge] = useState(login_challenge);
  const [processed, setProcessed] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(prompt);
  const router = useRouter();
  const login = api.login.loginUser.useMutation();

  useEffect(() => {
    function userRedirect(url: string) {
      if (typeof window !== "undefined") {
        window.location.href = url;
      } else {
        router.push(url);
      }
    }

    if (currentPrompt === "finished" && !processed) {
      setProcessed(true);
      void login
        .mutateAsync(loginChallenge)
        .then((res) => {
          userRedirect(res);
        })
        .catch((e: { message: string }) => {
          console.log(e);
          setError(e.message);
        });
    }
  }, [currentPrompt, login, loginChallenge, processed, router]);

  const errorElement = error ? (
    <Alert variant="destructive">
      <AlertCircleIcon />
      <AlertTitle>Something went wrong during authentication!</AlertTitle>
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : (
    <></>
  );

  if (prompt && !promptBypass) {
    switch (prompt) {
      case "login":
        return (
          <LoginTemplate
            title={"Welcome!"}
            description={"Please login to continue to " + clientName}
            havePtLinks
          >
            {errorElement}
            <SSOButtons />
          </LoginTemplate>
        );
      case "select_account":
        if (sessions.length !== 1) {
          return (
            <LoginTemplate
              title={"Welcome!"}
              description={
                "Please select an account to continue to " + clientName
              }
              havePtLinks
            >
              {errorElement}
              {sessions.map((s) => (
                <Button
                  variant={"outline"}
                  key={s.session.id}
                  className="flex w-full justify-start items-center space-x-2"
                  onClick={async (e) => {
                    e.preventDefault();
                    await authClient.multiSession.setActive({
                      sessionToken: s.session.token
                    });
                    setCurrentPrompt("finished");
                  }}
                >
                  <Image
                    src={s.user.image!}
                    alt={s.user.name}
                    width={25}
                    height={25}
                  />
                  <div className="flex flex-col items-center justify-start">
                    <span className="font-bold">{s.user.name}</span>
                    <span className="text-sm text-gray-400">
                      {s.user.email}
                    </span>
                  </div>
                </Button>
              ))}
            </LoginTemplate>
          );
        }
      default:
        setCurrentPrompt("finished"); 
    }
  } else {
    setCurrentPrompt("finished");
  }

  return (
    <LoginTemplate
      title={"Signing in..."}
      description={"Please wait while we sign you in."}
    >
      {errorElement}
    </LoginTemplate>
  );
}
