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
  X,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
  const { adminUser, adminLogoutMutation } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = React.useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return location === href;
    }
    return location.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await adminLogoutMutation.mutateAsync();
      setShowLogoutDialog(false);
      // The mutation will handle the redirect
    } catch (error) {
      console.error('Logout failed:', error);
      setShowLogoutDialog(false);
    }
  };

  const openLogoutDialog = () => {
    setShowLogoutDialog(true);
    setMobileMenuOpen(false); // Close mobile menu if open
  };

  return (
    <nav className="bg-slate-900/95 backdrop-blur-md border-b border-white/10 sticky top-0 z-50 shadow-xl">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/admin" className="flex items-center group">
              <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-200">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="ml-3 text-xl font-bold text-white">Admin Portal</span>
            </Link>
          </div>

          {/* Centered Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:justify-center md:flex-1">
            <div className="flex space-x-1 bg-slate-800/50 rounded-2xl p-1 backdrop-blur-sm">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href, item.exact);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "inline-flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200",
                      active
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
                        : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                    )}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right side - Admin info and Logout */}
          <div className="flex items-center gap-6">
            {/* Logout Button - Desktop */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openLogoutDialog}
              className="hidden md:flex bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-400/50 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700/50 transition-all duration-200"
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
        <div className="md:hidden bg-slate-900/95 backdrop-blur-md border-t border-white/10">
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
                    "flex items-center px-4 py-3 text-base font-medium rounded-xl transition-all duration-200 w-full",
                    active
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg"
                      : "text-slate-300 hover:bg-slate-700/50 hover:text-white"
                  )}
                >
                  <Icon className="h-5 w-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}
          </div>
          
          {/* Mobile Admin Info and Logout */}
          <div className="border-t border-white/10 px-4 py-3">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={openLogoutDialog}
              className="w-full bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20 hover:text-red-300 hover:border-red-400/50 transition-all duration-200"
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Logout
            </Button>
          </div>
        </div>
      )}

             {/* Logout Confirmation Dialog */}
       <Dialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
         <DialogContent className="sm:max-w-[425px] bg-slate-900 border border-white/20 text-white">
           <DialogHeader>
             <DialogTitle className="text-white flex items-center gap-3">
               <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                 <LogOut className="h-5 w-5 text-red-400" />
               </div>
               Confirm Logout
             </DialogTitle>
           </DialogHeader>
           <div className="py-4">
             <p className="text-slate-300">
               Are you sure you want to log out of the admin portal? You will need to sign in again to access admin features.
             </p>
           </div>
           <DialogFooter className="gap-3">
             <Button 
               variant="outline" 
               onClick={() => setShowLogoutDialog(false)}
               className="bg-slate-800 border-white/20 text-white hover:bg-slate-700"
             >
               Cancel
             </Button>
             <Button 
               variant="destructive" 
               onClick={handleLogout}
               disabled={adminLogoutMutation.isPending}
               className="bg-red-600 hover:bg-red-700 text-white"
             >
               {adminLogoutMutation.isPending ? 'Logging out...' : 'Yes, Logout'}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
    </nav>
  );
} 