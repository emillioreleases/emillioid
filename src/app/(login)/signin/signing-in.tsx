"use client";
import Image from "next/image";
import { redirect } from "next/navigation";

export default function SigningIn({ redirectUrl }: { redirectUrl: string }) {
  if (typeof window !== "undefined") {
    window.location.href = redirectUrl;
  } else {
    redirect(redirectUrl);
  }

  return (
    <>
      <header className="justify-left mx-[-1rem] mt-[-1.5rem] mb-[-1.5rem] flex min-w-full items-stretch space-x-2 p-4">
        <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
      </header>
      <main className="justify-left mb-12 flex w-full flex-col items-center space-y-4 sm:mb-5 sm:h-fit">
        <div className="flex w-full flex-col items-start justify-center">
          <h1 className="text-2xl font-bold text-white">Signing in...</h1>
          <h5 className="text-sm text-gray-400">
            Please wait while we sign you in.
          </h5>
        </div>
      </main>
    </>
  );
}
