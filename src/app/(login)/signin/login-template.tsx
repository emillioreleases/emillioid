import Image from "next/image";

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
        <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
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
          <h1 className="text-2xl font-bold text-white">{title}</h1>
          <h5 className="text-sm text-gray-400">{description}</h5>
        </div>
        {children}
        {havePtLinks && (
          <div className="flex items-stretch justify-center space-x-2 text-sm text-gray-400">
            <a href="https://www.bloxvalschools.com/page/privacy-policy">
              Privacy Policy
            </a>
            <div className="w-[1px] border-[0.5px]" />
            <a href="https://www.bloxvalschools.com/page/tos">Terms of Use</a>
          </div>
        )}
      </main>
    </>
  );
}
