import { Heart } from "lucide-react";
import Image from "next/image";
import { HomeVideoBold, W95Font } from "~/app/fonts";

export default function LoginTemplate({
  title,
  description,
  partnerLogo,
  havePtLinks,
  children,
}: {
  title: React.ReactNode | string;
  description: React.ReactNode | string;
  partnerLogo?: string;
  havePtLinks?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <>
      <header className="justify-left mx-[-1rem] mt-[-1.5rem] mb-[-1.5rem] flex min-w-full items-stretch space-x-2 p-4">
        <div>
          <Image src={"/logo.png"} alt={"Logo"} width={200} height={89} />
        </div>
        {partnerLogo && (
          <>
            <div className="h-auto w-[0.1px] border-[0.05px] border-white" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={partnerLogo} alt={"Logo"} />
          </>
        )}
      </header>
      <main className="justify-left mb-12 flex w-full flex-col items-center space-y-4 sm:mb-5 sm:h-fit">
        <div className="flex w-full flex-col items-start justify-center">
          <span
            className={
              HomeVideoBold.className +
              " my-1 inline text-3xl leading-6 font-bold text-black"
            }
          >
            {title}
          </span>
          <h5 className={"text-md text-black " + W95Font.className}>
            {description}
          </h5>
        </div>
        {children}
        {havePtLinks && (
          <div className="flex items-stretch justify-center space-x-2 text-sm text-black">
            <a href="https://www.bloxvalschools.com/page/privacy-policy">
              Privacy Policy
            </a>
            <div className="w-[1px] border-[0.5px] border-gray-800" />
            <a href="https://www.bloxvalschools.com/page/tos">Terms of Use</a>
          </div>
        )}
        <span className="flex text-xs text-black">
          Created with <Heart className="mx-1 h-4 w-4 text-red-700" /> by Team
          Emillio.
        </span>
      </main>
    </>
  );
}
