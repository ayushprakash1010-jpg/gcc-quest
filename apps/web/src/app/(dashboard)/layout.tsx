import { ReactNode } from "react";
import { auth, signOut } from "../../../auth";
import { redirect } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-tight">GCC Quest AI</h1>
        </div>

        <SidebarNav />

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold">
              {session.user.name?.charAt(0) ||
                session.user.email?.charAt(0) ||
                "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">
                {session.user.name || "User"}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {session.user.email}
              </p>
            </div>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <button className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-800 rounded-md transition-colors">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 flex items-center justify-between px-8 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm md:hidden">
          <h1 className="text-xl font-bold">GCC Quest AI</h1>
        </header>
        <div className="flex-1 overflow-y-auto p-8">{children}</div>
      </main>
    </div>
  );
}
