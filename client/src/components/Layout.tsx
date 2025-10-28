import { useState } from "react";
import Sidebar from "./Sidebar";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Toggle Button - Always Visible, positioned relative to sidebar state */}
      <div 
        className={`fixed top-4 z-50 transition-all duration-300 ${
          sidebarOpen ? "left-[260px]" : "left-4"
        }`}
      >
        <Button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          variant="outline"
          size="icon"
          className="bg-white shadow-md hover:bg-gray-100 border-gray-300"
          data-testid="button-toggle-sidebar"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Sidebar - slides in and out */}
      <div
        className={`fixed left-0 top-0 h-full transition-transform duration-300 ease-in-out z-40 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar />
      </div>

      {/* Main Content - adjusts width based on sidebar state */}
      <main 
        className={`flex-1 overflow-y-auto transition-all duration-300 ${
          sidebarOpen ? "ml-64" : "ml-0"
        }`}
      >
        {children}
      </main>
    </div>
  );
}