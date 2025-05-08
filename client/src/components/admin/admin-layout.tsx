import React from 'react';
import AdminHeader from '@/components/admin-header';

interface AdminLayoutProps {
  children: React.ReactNode;
  activePage?: string;
}

export default function AdminLayout({ children, activePage = '' }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader active={activePage || 'dashboard'} />
      <div className="flex">
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
