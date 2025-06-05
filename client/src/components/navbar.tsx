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

export default function Navbar() {
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
    { name: "MY PITCHES", path: "/my-pitches" },
  ];
  
  // Add admin link only for admin users
  if (isAdmin) {
    navItems.push({ name: "ADMIN", path: "/admin" });
  }

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="flex items-center">
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold text-2xl tracking-tight">
                  <span>Quote</span><span className="font-extrabold">Bid</span>
                </span>
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
                      ? "text-blue-600 font-medium uppercase text-sm px-3 py-2 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-blue-600 font-medium uppercase text-sm px-3 py-2"
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
                <button className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-200 relative">
                  <svg 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-6 w-6 text-gray-500" 
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
              <DropdownMenuContent align="end" className="w-80">
                <div className="px-4 py-3 border-b border-gray-100">
                  <h3 className="text-sm font-medium">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-gray-500">
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
                          className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.isRead ? 'bg-blue-50' : ''}`}
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
                            <div className={`flex-shrink-0 rounded-full ${iconBgClass} p-2`}>
                              {icon}
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                              <div className="text-xs text-gray-500 mt-1">
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
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.createdAt && formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </p>
                            </div>
                            {!notification.isRead && (
                              <div className="ml-2 flex-shrink-0">
                                <span className="inline-block h-2 w-2 rounded-full bg-blue-500"></span>
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
                  <div className="px-4 py-3 border-t border-gray-100">
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        clearAllNotifications();
                      }}
                      className="w-full text-center py-2 px-4 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md border border-red-200 hover:border-red-300 transition-colors"
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
                  <div className="flex items-center cursor-pointer">
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
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
                    <span className="ml-2 text-sm text-gray-700">{user?.fullName || 'Account'}</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/account" className="cursor-pointer w-full">
                      View Account
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="cursor-pointer w-full">
                        Admin Dashboard
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem asChild>
                    <Link href="/logout" className="cursor-pointer w-full text-red-600">
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
