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
import { Button } from '../ui/button';
import { Bell, Menu, X, Bookmark, MessageSquare, User, Settings, LogOut } from 'lucide-react';

export default function DarkNavbar() {
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
    <nav className="bg-slate-900 border-b border-white/20 shadow-sm sticky top-0 z-50">
      <div className="px-3 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <span className="font-black text-2xl sm:text-3xl tracking-tight">
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                  <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
                </span>
                <div className="ml-2 sm:ml-3 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
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
                      ? "text-white font-medium uppercase text-sm px-3 py-2 border-b-2 border-blue-400"
                      : "text-white/80 hover:text-white font-medium uppercase text-sm px-3 py-2 transition-all duration-300"
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
                  <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                    Sign Up
                  </Button>
                </Link>
              </>
            ) : (
              <>
                {/* Mobile Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="md:hidden relative p-2 hover:bg-white/10 focus:outline-none focus:ring-0 focus:bg-white/10">
                      <Bell className="h-5 w-5 text-white/80" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium min-w-[16px]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 bg-slate-800 border-white/20">
                    <div className="px-4 py-3 border-b border-white/20">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {notifications.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllNotifications}
                            className="text-xs text-white/60 hover:text-white/80 hover:bg-white/10"
                          >
                            Clear all
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-white/60">
                          <Bell className="h-8 w-8 mx-auto mb-2 text-white/30" />
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className={`px-4 py-3 cursor-pointer hover:bg-white/10 ${!notification.isRead ? 'bg-blue-600/20' : ''}`}
                            onClick={() => {
                              markAsRead(notification.id);
                              if (notification.linkUrl) {
                                window.location.href = notification.linkUrl;
                              }
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${!notification.isRead ? 'bg-blue-400' : 'bg-white/30'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-white/70 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-white/50 mt-1">
                                  {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : 'Just now'}
                                </p>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Desktop Notifications */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="hidden sm:flex relative p-2 hover:bg-white/10 focus:outline-none focus:ring-0 focus:bg-white/10">
                      <Bell className="h-5 w-5 text-white/80" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium min-w-[16px]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80 bg-slate-800 border-white/20">
                    <div className="px-4 py-3 border-b border-white/20">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-white">Notifications</h3>
                        {notifications.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={clearAllNotifications}
                            className="text-xs text-white/60 hover:text-white/80 hover:bg-white/10"
                          >
                            Clear all
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-center text-white/60">
                          <Bell className="h-8 w-8 mx-auto mb-2 text-white/30" />
                          <p className="text-sm">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notification) => (
                          <DropdownMenuItem
                            key={notification.id}
                            className={`px-4 py-3 cursor-pointer hover:bg-white/10 ${!notification.isRead ? 'bg-blue-600/20' : ''}`}
                            onClick={() => {
                              markAsRead(notification.id);
                              if (notification.linkUrl) {
                                window.location.href = notification.linkUrl;
                              }
                            }}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`w-2 h-2 rounded-full mt-2 ${!notification.isRead ? 'bg-blue-400' : 'bg-white/30'}`} />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {notification.title}
                                </p>
                                <p className="text-sm text-white/70 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-white/50 mt-1">
                                  {notification.createdAt ? formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true }) : 'Just now'}
                                </p>
                              </div>
                            </div>
                          </DropdownMenuItem>
                        ))
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Menu Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="md:hidden p-2 hover:bg-white/10"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5 text-white/80" />
                  ) : (
                    <Menu className="h-5 w-5 text-white/80" />
                  )}
                </Button>

                {/* Desktop User Menu */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center cursor-pointer group">
                        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
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
                            className={`h-5 w-5 text-white/80 fallback-avatar ${user?.avatar ? 'hidden' : 'block'}`}
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
                        <span className="ml-2 text-sm text-white/80 group-hover:text-white transition-colors duration-300">{user?.fullName || 'Account'}</span>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
                      <DropdownMenuItem asChild>
                        <Link href="/account" className="flex items-center text-white hover:bg-slate-700">
                          <User className="mr-2 h-4 w-4" />
                          Profile
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/saved" className="flex items-center text-white hover:bg-slate-700">
                          <Bookmark className="mr-2 h-4 w-4" />
                          Saved
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/my-pitches" className="flex items-center text-white hover:bg-slate-700">
                          <MessageSquare className="mr-2 h-4 w-4" />
                          My Pitches
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-slate-700" />
                      <DropdownMenuItem onClick={handleLogout} className="text-white hover:bg-slate-700">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {user && mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-t border-white/20 shadow-lg">
          <div className="px-4 py-3 space-y-3">
            {/* User Info */}
            <div className="flex items-center space-x-3 pb-3 border-b border-white/20">
              <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
                {user?.avatar ? (
                  <img 
                    src={user.avatar.startsWith('http') ? user.avatar : `${window.location.origin}${user.avatar}`}
                    alt={user.fullName || 'Profile'}
                    className="h-full w-full object-cover rounded-full"
                  />
                ) : (
                  <User className="h-6 w-6 text-white/80" />
                )}
              </div>
              <div>
                <p className="font-medium text-white">{user?.fullName || 'User'}</p>
                <p className="text-sm text-white/60">{user?.email}</p>
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
                      ? "bg-blue-600 text-blue-100"
                      : "text-white/80 hover:bg-white/10"
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
              className="flex items-center space-x-3 py-2 px-3 rounded-lg text-white/80 hover:bg-white/10 transition-colors"
            >
                              <Settings className="h-5 w-5" />
                <span className="font-medium">Account Settings</span>
            </Link>

            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 py-2 px-3 rounded-lg text-red-400 hover:bg-red-500/20 transition-colors w-full text-left"
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
