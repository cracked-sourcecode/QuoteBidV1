import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

type AdminHeaderProps = {
  active?: string;
};

export default function AdminHeader({ active }: AdminHeaderProps) {
  const [location] = useLocation();
  const { adminUser, sessionExpiresAt } = useAdminAuth();
  
  // Fix for navigation highlighting - check if location starts with the path
  // Use the passed active prop or determine from location
  const activeSection = active || (
    location === "/admin" ? "dashboard" :
    location.startsWith("/admin/opportunities") ? "opportunities" :
    location.startsWith("/admin/publications") ? "publications" :
    location.startsWith("/admin/pitches") ? "pitches" :
    location.startsWith("/admin/billing") ? "billing" :
    location.startsWith("/admin/users") ? "users" :
    location.startsWith("/admin/agreements") ? "agreements" :
    location.startsWith("/admin/support") ? "support" :
    location.startsWith("/admin/analytics") ? "analytics" :
    "dashboard"
  );

  if (!adminUser) {
    return null;
  }

  return (
    <nav className="bg-white border-b border-gray-200 relative z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16">
          <div className="flex items-center flex-grow">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin" className="flex items-center">
                <span className="text-qpurple font-bold text-2xl tracking-tight mr-2">
                  <span>Quote</span><span className="font-extrabold">Bid</span>
                </span>
                <span className="text-gray-600 font-medium text-sm border-l border-gray-300 pl-2">
                  Admin Portal
                </span>
              </Link>
            </div>
            
            {/* Navigation links */}
            <div className="hidden md:ml-8 md:flex md:space-x-8">
              <Link 
                href="/admin"
                className={`${
                  activeSection === "dashboard"
                    ? "text-qpurple font-medium text-sm px-3 py-2 border-b-2 border-qpurple"
                    : "text-gray-600 hover:text-qpurple font-medium text-sm px-3 py-2"
                }`}
              >
                Dashboard
              </Link>
              <div className="relative group">
                <Link 
                  href="/admin/opportunities"
                  className={`${
                    activeSection === "opportunities" || activeSection === "publications"
                      ? "text-qpurple font-medium text-sm px-3 py-2 border-b-2 border-qpurple"
                      : "text-gray-600 hover:text-qpurple font-medium text-sm px-3 py-2"
                  } flex items-center`}
                >
                  <span>Opportunities</span>
                  <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </Link>
                <div className="absolute hidden group-hover:block bg-white border border-gray-200 rounded-md shadow-lg z-50 w-48 py-1">
                  <Link 
                    href="/admin/opportunities"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Opportunities List
                  </Link>
                  <Link 
                    href="/admin/publications"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Manage Publications
                  </Link>
                </div>
              </div>
              <Link 
                href="/admin/pitches"
                className={`${
                  activeSection === "pitches"
                    ? "text-qpurple font-medium text-sm px-3 py-2 border-b-2 border-qpurple"
                    : "text-gray-600 hover:text-qpurple font-medium text-sm px-3 py-2"
                }`}
              >
                Pitches
              </Link>
              <Link 
                href="/admin/billing"
                className={`${
                  activeSection === "billing"
                    ? "text-amber-600 font-medium text-sm px-3 py-2 border-b-2 border-amber-600"
                    : "text-gray-600 hover:text-amber-600 font-medium text-sm px-3 py-2"
                }`}
              >
                Billing
              </Link>

              <Link 
                href="/admin/users"
                className={`${
                  activeSection === "users"
                    ? "text-qpurple font-medium text-sm px-3 py-2 border-b-2 border-qpurple"
                    : "text-gray-600 hover:text-qpurple font-medium text-sm px-3 py-2"
                }`}
              >
                Users
              </Link>
              <Link 
                href="/admin/support"
                className={`${
                  activeSection === "support"
                    ? "text-qpurple font-medium text-sm px-3 py-2 border-b-2 border-qpurple"
                    : "text-gray-600 hover:text-qpurple font-medium text-sm px-3 py-2"
                }`}
              >
                Support
              </Link>
              <Link 
                href="/admin/analytics"
                className={`${
                  activeSection === "analytics"
                    ? "text-blue-600 font-medium text-sm px-3 py-2 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-blue-600 font-medium text-sm px-3 py-2"
                }`}
              >
                Analytics
              </Link>
            </div>
          </div>

          {/* Right side navigation items */}
          <div className="flex items-center ml-auto mr-4">
            <div className="relative">
              {/* Admin menu with dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="flex items-center cursor-pointer">
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-5 w-5 text-purple-600" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                        />
                      </svg>
                    </div>
                    <span className="ml-2 text-sm text-gray-700">{adminUser?.fullName || adminUser?.username || 'Admin'}</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 z-50">
                  <DropdownMenuItem disabled className="opacity-70">
                    <span>Signed in as Admin</span>
                  </DropdownMenuItem>
                  
                  {sessionExpiresAt && (
                    <>
                      <DropdownMenuItem disabled className="opacity-70 text-xs">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            Session expires: {sessionExpiresAt.toLocaleString()}
                          </span>
                        </div>
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin-logout" className="cursor-pointer w-full text-red-600">
                      Sign out
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}