import Image from "next/image";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="justify-left mx-[-1rem] mt-[-1.5rem] mb-[-1.5rem] flex min-w-full items-stretch space-x-2 p-4">
        <Image src={"/logo.png"} alt={"Logo"} width={100} height={75} />
      </header>
      {children}
    </>
  );
}
