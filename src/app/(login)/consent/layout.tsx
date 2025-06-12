import Image from "next/image";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="mx-[-1rem] mt-[-1.5rem] mb-[-0.75rem] flex min-w-full items-stretch justify-center space-x-2 p-4">
        <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
      </header>
      {children}
    </>
  );
}
