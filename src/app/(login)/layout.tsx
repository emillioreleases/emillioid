export default function UILayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[100vh] w-full flex-col justify-center border-slate-700 bg-[rgba(15,15,15,0.9)] p-12 shadow-md sm:h-fit sm:max-w-[450px]">
      {children}
    </div>
  );
}
