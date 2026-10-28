"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import CommandMenu from "@/components/CommandMenu";
import { PageLoading } from "@/components/kit";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/lib/auth";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState(false);
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);
  if (loading || !user)
    return (
      <div className="mx-auto max-w-7xl p-8">
        <PageLoading />
      </div>
    );
  return (
    <div className="min-h-screen">
      <div className="no-print">
        <Sidebar onSearch={() => setSearch(true)} />
        <CommandMenu open={search} setOpen={setSearch} />
      </div>
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
