import { ReactNode } from 'react';
import Sidebar from './Sidebar';
import MobileSidebar from './MobileSidebar';
import Header from './Header';
import { useSidebar } from '@/context/SidebarContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { isExpanded } = useSidebar();

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      
      {/* Mobile Sidebar Overlay */}
      <div className="lg:hidden">
        <MobileSidebar />
      </div>
      
      <main className="flex-1 overflow-hidden flex flex-col">
        <Header />
        <div className="flex-1 overflow-auto p-3 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
