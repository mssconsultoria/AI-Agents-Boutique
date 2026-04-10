import PublicNav from "@/components/PublicNav";
import PublicFooter from "@/components/PublicFooter";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-col min-h-screen">
      <PublicNav />
      <main className="flex-1 pt-14">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
