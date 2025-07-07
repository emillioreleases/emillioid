"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { api } from "~/trpc/react";

export default function ActionButtons({
  finalRedirect,
}: {
  finalRedirect: string;
}) {
  const router = useRouter();
  const [disabled, setDisabled] = useState(false);

  const logoutRequest = api.login.signOut.useMutation({
    onSuccess: () => {
      userRedirect(finalRedirect);
    },
  });

  const userRedirect = (url: string) => {
    if (typeof window !== "undefined") {
      window.location.href = url;
    } else {
      router.push(url);
    }
  };

  return (
    <>
      <Button
        className="w-full md:w-[50%]"
        variant={"secondary"}
        disabled={disabled}
        onClick={() => {
          setDisabled(true);
          userRedirect(finalRedirect);
        }}
      >
        No
      </Button>
      <Button
        className="w-full md:w-[50%]"
        variant={"destructive"}
        disabled={disabled}
        onClick={() => {
          setDisabled(true);
          logoutRequest.mutate();
        }}
      >
        Yes
      </Button>
    </>
  );
}
