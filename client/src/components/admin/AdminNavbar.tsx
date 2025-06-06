import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import {
  LayoutDashboard,
  FileText,
  Users,
  MessageSquare,
  LifeBuoy,
  CreditCard,
  BarChart3,
  BookOpen,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  {
    href: '/admin',
    label: 'Dashboard',
    icon: LayoutDashboard,
    exact: true
  },
  {
    href: '/admin/opportunities',
    label: 'Opportunities',
    icon: FileText
  },
  {
    href: '/admin/publications',
    label: 'Publications',
    icon: BookOpen
  },
  {
    href: '/admin/users',
    label: 'Users',
    icon: Users
  },
  {
    href: '/admin/pitches',
    label: 'Pitches',
    icon: MessageSquare
  },
  {
    href: '/admin/billing',
    label: 'Billing',
    icon: CreditCard
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart3
  },
  {
    href: '/admin/pricing',
    label: 'Pricing',
    icon: Settings
  },
  {
    href: '/admin/support',
    label: 'Support',
    icon: LifeBuoy
  }
];

export default function AdminNavbar() {
  const [location] = useLocation();
  const { adminUser } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location === href;
    }
    return location.startsWith(href);
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/admin" className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-purple-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="ml-2 text-xl font-bold text-gray-900">Admin Portal</span>
            </Link>
          </div>

          {/* Centered Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:justify-center md:flex-1">
            <div className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      active
                        ? "bg-purple-100 text-purple-700"
                        : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    )}
                  >
                    <Icon className="h-4 w-4 mr-1.5" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side - Logout only */}
          <div className="flex items-center">
            {/* Logout Button - Desktop */}
            <Link href="/admin-logout" className="hidden md:block">
              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="h-4 w-4 mr-1.5" />
                Logout
              </Button>
            </Link>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href, item.exact);
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center px-3 py-2 text-base font-medium rounded-md transition-colors w-full",
                    active
                      ? "bg-purple-100 text-purple-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          
          {/* Mobile Logout */}
          <div className="border-t border-gray-200 px-4 py-3">
            <Link href="/admin-logout" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="h-4 w-4 mr-1.5" />
                Logout
              </Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
} 