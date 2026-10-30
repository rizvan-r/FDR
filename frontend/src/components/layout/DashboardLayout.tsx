import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { GovBanner } from './GovBanner';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export const DashboardLayout: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gov-bg">
      {/* Official Government Banner */}
      <GovBanner />

      {/* Primary Header */}
      <Header
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Role-Aware Sidebar */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Official Institutional Footer */}
      <footer className="bg-white border-t border-gov-border mt-auto py-4 text-center text-xs text-gov-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            © 2026 Government Institutional Security Deposit System (FDR-Chain). Designed for SIH 2026.
          </div>
          <div className="flex items-center space-x-4 text-[11px]">
            <span>Terms of Service</span>
            <span>•</span>
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Security Guidelines</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
