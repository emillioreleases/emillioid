"use client";
import { Button } from "~/components/ui/button";
import LoginTemplate from "../(login)/signin/login-template";
import { useRouter } from "next/navigation";

export function InvalidFlow() {
  const router = useRouter();

  return (
    <LoginTemplate
      title="Invalid Flow"
      description="The flow you are trying to access is invalid."
    >
      <div className="flex w-full flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2">
        <Button
          className="w-full"
          variant={"secondary"}
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>
    </LoginTemplate>
  );
}
