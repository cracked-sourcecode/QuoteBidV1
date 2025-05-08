import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { 
  LayoutDashboard, 
  NewspaperIcon, 
  Users, 
  Settings, 
  HelpCircle, 
  LogOut 
} from 'lucide-react';

const AdminNavbar = () => {
  const [location] = useLocation();
  const { adminUser } = useAdminAuth();
  
  if (!adminUser) {
    return null;
  }
  
  const isActive = (path: string) => {
    return location.startsWith(path);
  };
  
  const navItems = [
    { 
      path: '/admin', 
      label: 'Dashboard', 
      icon: <LayoutDashboard className="h-5 w-5" /> 
    },
    { 
      path: '/admin/opportunities', 
      label: 'Opportunities', 
      icon: <NewspaperIcon className="h-5 w-5" /> 
    },
    { 
      path: '/admin/users', 
      label: 'Users', 
      icon: <Users className="h-5 w-5" /> 
    },
    { 
      path: '/admin/support', 
      label: 'Support', 
      icon: <HelpCircle className="h-5 w-5" /> 
    }
  ];
  
  return (
    <div className="bg-slate-900 text-white min-h-screen w-64 fixed left-0 top-0 z-40 overflow-y-auto">
      <div className="p-4 flex items-center gap-3 border-b border-slate-700">
        <div className="rounded-md bg-indigo-500 p-2">
          <LayoutDashboard className="h-6 w-6" />
        </div>
        <div>
          <h1 className="font-bold text-xl">QuoteBid</h1>
          <p className="text-xs text-slate-400">Admin Panel</p>
        </div>
      </div>
      
      <div className="p-4">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive(item.path) 
                  ? 'bg-indigo-600 text-white' 
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-700">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-slate-700 flex items-center justify-center">
              {adminUser.fullName?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{adminUser.fullName || adminUser.username}</p>
              <p className="text-xs text-slate-400 truncate">{adminUser.email}</p>
            </div>
          </div>
          
          <Link 
            href="/admin-logout"
            className="flex items-center gap-3 px-3 py-2 rounded-md text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminNavbar;