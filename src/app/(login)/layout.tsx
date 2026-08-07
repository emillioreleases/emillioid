export default function UILayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full flex-col justify-center border-t-3 border-r-3 border-b-3 border-l-3 border-slate-700 border-t-white border-r-black border-b-black border-l-white bg-[#c3c3c3] p-12 text-white shadow-md sm:h-fit sm:max-w-112.5">
      <div className="-m-11 mb-12 bg-[#0804ac]">
        <br />
      </div>
      {children}
    </div>
  );
}
