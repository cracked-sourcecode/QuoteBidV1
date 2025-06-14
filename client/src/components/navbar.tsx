import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth, AuthContext } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useContext } from "react";
import { Button } from './ui/button';
import { Bell, Menu, X, Bookmark, MessageSquare, User, Settings, LogOut } from 'lucide-react';

export default function Navbar() {
  const [location] = useLocation();
  const authContext = useContext(AuthContext);
  const { notifications, unreadCount, markAsRead, clearAllNotifications } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  if (!authContext) {
    throw new Error("Navbar must be used within an AuthProvider");
  }
  
  const { user, logoutMutation } = authContext;
  
  // Check if user is admin - this is just a UI check, the real permission check happens on the server
  const isAdmin = user?.isAdmin === true;

  const navItems = [
    { name: "OPPORTUNITIES", path: "/opportunities" },
    { name: "SAVED", path: "/saved" },
    { name: "MY PITCHES", path: "/my-pitches" },
  ];
  
  // Add admin link only for admin users
  if (isAdmin) {
    navItems.push({ name: "ADMIN", path: "/admin" });
  }

  const mobileNavItems = [
    { name: 'Opportunities', path: '/opportunities', icon: MessageSquare },
    { name: 'Saved', path: '/saved', icon: Bookmark },
    { name: 'My Pitches', path: '/my-pitches', icon: MessageSquare },
  ];

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <span className="font-black text-2xl sm:text-3xl tracking-tight">
                  <span className="bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">Quote</span>
                  <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Bid</span>
                </span>
                <div className="ml-2 sm:ml-3 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-100 border border-blue-200 rounded text-blue-700 text-xs font-bold uppercase tracking-wider">
                  Beta
                </div>
              </Link>
            </div>
            
            {/* Desktop Navigation links */}
            <div className="hidden md:ml-8 md:flex md:space-x-8">
              {navItems.map((item) => (
                <Link 
                  key={item.path}
                  href={item.path}
                  className={`${
                    location === item.path
                      ? "text-gray-900 font-medium uppercase text-sm px-3 py-2 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900 font-medium uppercase text-sm px-3 py-2 transition-all duration-300"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right side navigation items */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {!user ? (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Sign Up
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {/* Desktop Notifications */}
                <Button variant="ghost" size="sm" className="hidden sm:flex relative p-2">
                  <Bell className="h-5 w-5 text-gray-600" />
                </Button>

                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden p-2"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5 text-gray-600" />
                  ) : (
                    <Menu className="h-5 w-5 text-gray-600" />
                  )}
                </Button>

                {/* Desktop User Menu */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center cursor-pointer group">
                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {user?.avatar ? (
                            <img 
                              src={user.avatar.startsWith('http') ? user.avatar : `${window.location.origin}${user.avatar}`}
                              alt={user.fullName || 'Profile'}
                              className="h-full w-full object-cover rounded-full"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const parent = e.currentTarget.parentElement;
                                if (parent) {
                                  const svg = parent.querySelector('.fallback-avatar');
                                  if (svg) {
                                    (svg as HTMLElement).style.display = 'block';
                                  }
                                }
                              }}
                            />
                          ) : null}
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-5 w-5 text-gray-600 fallback-avatar ${user?.avatar ? 'hidden' : 'block'}`}
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
                        <span className="ml-2 text-sm text-gray-700 group-hover:text-gray-900 transition-colors duration-300">{user?.fullName || 'Account'}</span>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem asChild>
                        <Link href="/account" className="flex items-center">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/saved" className="flex items-center">
                          <Bookmark className="mr-2 h-4 w-4" />
                          Saved
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/my-pitches" className="flex items-center">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          My Pitches
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Mobile User Profile Photo Only */}
                <div className="md:hidden">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar.startsWith('http') ? user.avatar : `${window.location.origin}${user.avatar}`}
                        alt={user.fullName || 'Profile'}
                        className="h-full w-full object-cover rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const svg = parent.querySelector('.fallback-avatar');
                            if (svg) {
                              (svg as HTMLElement).style.display = 'block';
                            }
                          }
                        }}
                      />
                    ) : null}
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-5 w-5 text-gray-600 fallback-avatar ${user?.avatar ? 'hidden' : 'block'}`}
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
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {user && mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 shadow-lg">
          <div className="px-4 py-3 space-y-3">
            {/* User Info */}
            <div className="flex items-center space-x-3 pb-3 border-b border-gray-100">
              <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img 
                    src={user.avatar.startsWith('http') ? user.avatar : `${window.location.origin}${user.avatar}`}
                    alt={user.fullName || 'Profile'}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <User className="h-6 w-6 text-gray-600" />
                )}
              </div>
              <div>
                <p className="font-medium text-gray-900">{user?.fullName || 'User'}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>

            {/* Navigation Items */}
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 py-2 px-3 rounded-lg transition-colors ${
                    location === item.path
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            })}

            {/* Additional Menu Items */}
            <Link
              href="/account"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center space-x-3 py-2 px-3 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
                              <Settings className="h-5 w-5" />
                <span className="font-medium">Account Settings</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 py-2 px-3 rounded-lg text-red-700 hover:bg-red-50 transition-colors w-full text-left"
            >
              <LogOut className="h-5 w-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
