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

export default function DarkNavbar() {
  const [location] = useLocation();
  const authContext = useContext(AuthContext);
  const { notifications, unreadCount, markAsRead, clearAllNotifications } = useNotifications();
  
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

  return (
    <nav className="bg-slate-900 border-b border-white/20 shadow-sm sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <span className="font-black text-3xl tracking-tight">
                  <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">Quote</span>
                  <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">Bid</span>
                </span>
                <div className="ml-3 px-2 py-1 bg-blue-500/20 border border-blue-400/30 rounded text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  Beta
                </div>
              </Link>
            </div>
            
            {/* Navigation links */}
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
          <div className="flex items-center">
            {/* Notifications Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 rounded-full hover:bg-white/10 focus:outline-none focus:ring-0 focus:ring-offset-0 focus:shadow-none relative transition-all duration-300" style={{outline: 'none', boxShadow: 'none'}}>
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6 text-white/80 hover:text-white transition-colors duration-300" 
                    fill="none" 
                    viewBox="0 0 24 24" 
                    stroke="currentColor"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
                    />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80 bg-slate-950 border border-slate-800 shadow-2xl">
                <div className="px-4 py-3 border-b border-slate-800/60">
                  <h3 className="text-sm font-medium text-white">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-400">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((notification) => {
                      const iconColor = notification.iconColor || 'blue';
                      const iconBgClass = `bg-${iconColor}-100`;
                      const iconTextClass = `text-${iconColor}-500`;
                      
                      let icon;
                      switch (notification.icon) {
                        case 'check-circle':
                          icon = (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconTextClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          );
                          break;
                        case 'x-circle':
                          icon = (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconTextClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          );
                          break;
                        case 'credit-card':
                          icon = (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconTextClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                          );
                          break;
                        case 'edit':
                          icon = (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconTextClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          );
                          break;
                        case 'tag':
                          icon = (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconTextClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                            </svg>
                          );
                          break;
                        case 'thumbs-up':
                          icon = (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconTextClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905a3.61 3.61 0 01-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                            </svg>
                          );
                          break;
                        default:
                          icon = (
                            <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 ${iconTextClass}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          );
                      }
                      
                      return (
                        <div 
                          key={notification.id} 
                          className={`px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 cursor-pointer transition-all duration-300 ${!notification.isRead ? 'bg-blue-900/30' : ''}`}
                          onClick={() => {
                            if (notification.linkUrl) {
                              // Mark as read and navigate
                              markAsRead(notification.id);
                              window.location.href = notification.linkUrl;
                            } else {
                              // Just mark as read
                              markAsRead(notification.id);
                            }
                          }}
                        >
                          <div className="flex items-start">
                            <div className={`flex-shrink-0 rounded-full bg-slate-800/60 p-2`}>
                              {icon}
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-white">{notification.title}</p>
                              <div className="text-xs text-gray-400 mt-1">
                                {notification.linkUrl && notification.message.includes('Click here') ? (
                                  <span>
                                    {notification.message.split('Click here')[0]}
                                    <a 
                                      href={notification.linkUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline font-medium"
                                      onClick={(e) => {
                                        e.stopPropagation(); // Prevent the notification click handler
                                      }}
                                    >
                                      click here
                                    </a>
                                    {notification.message.split('Click here')[1]}
                                  </span>
                                ) : (
                                  <span>{notification.message}</span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="ml-2 flex-shrink-0">
                                <span className="inline-block h-2 w-2 rounded-full bg-blue-400"></span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {/* Clear notifications button - only show if there are notifications */}
                {notifications.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-800/60">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        clearAllNotifications();
                      }}
                      className="w-full text-center py-2 px-4 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded-md border border-red-500/40 hover:border-red-400/60 transition-all duration-300"
                    >
                      Clear All Notifications
                    </button>
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <div className="ml-3 relative">
              {/* User menu with dropdown */}
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
                            // Fallback to SVG icon if image fails to load
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
                    {isAdmin && (
                      <div className="ml-1 bg-yellow-500/20 rounded-full p-1" title="Admin User">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.664 1.319a.75.75 0 01.672 0 41.059 41.059 0 018.198 5.424.75.75 0 01-.254 1.285 31.372 31.372 0 00-7.86 3.83.75.75 0 01-.84 0 31.508 31.508 0 00-2.08-1.287V9.394c0-.244.116-.463.302-.592a35.504 35.504 0 013.305-2.033.75.75 0 00-.714-1.319 37 37 0 00-3.446 2.12A2.216 2.216 0 006 9.393v.38a31.293 31.293 0 00-4.28-1.746.75.75 0 01-.254-1.285 41.059 41.059 0 018.198-5.424zM6 11.459a29.848 29.848 0 00-2.455-1.158 41.029 41.029 0 00-.39 3.114.75.75 0 00.419.74c.528.256 1.046.53 1.554.82-.21-.899-.455-1.79-.728-2.516zM21 12.74a.75.75 0 00-.39-3.114 29.849 29.849 0 00-5.325 2.076L10 9.5l-5.285 2.202a29.849 29.849 0 00-5.325-2.076.75.75 0 00-.39 3.114 29.849 29.849 0 005.5 2.17L10 17.207l5.5-2.297a29.849 29.849 0 005.5-2.17z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-slate-900/95 border border-white/20 backdrop-blur-lg shadow-2xl">
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer w-full text-white hover:bg-white/10 focus:bg-white/10 transition-all duration-300">
                      View Account
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer w-full text-white hover:bg-white/10 focus:bg-white/10 transition-all duration-300">
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem asChild>
                    <Link href="/logout" className="cursor-pointer w-full text-red-400 hover:bg-red-500/20 focus:bg-red-500/20 transition-all duration-300">
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
