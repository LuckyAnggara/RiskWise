
"use client";

import React, { useState, useEffect } from "react";
import Link from 'next/link'; 
import { usePathname, useRouter } from 'next/navigation'; // Import useRouter
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { AppLogo } from "@/components/icons";
import { SidebarNav } from "./sidebar-nav";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings as SettingsIcon, Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { getCurrentUprId, getCurrentPeriod, initializeAppContext } from '@/lib/upr-period-context';
import { useAuth } from '@/contexts/auth-context'; // Import useAuth
import { auth } from '@/lib/firebase/config'; // Import auth untuk signOut
import { signOut } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [currentUpr, setCurrentUpr] = useState('');
  const [currentPeriodDisplay, setCurrentPeriodDisplay] = useState('');
  const { currentUser, loading: authLoading } = useAuth(); // Gunakan useAuth
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const context = initializeAppContext();
    setCurrentUpr(context.uprId);
    setCurrentPeriodDisplay(context.period);
  }, []);

  useEffect(() => {
    if (!authLoading && !currentUser && pathname !== '/login') {
      router.push('/login');
    }
  }, [currentUser, authLoading, router, pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logout Berhasil', description: 'Anda telah berhasil keluar.' });
      router.push('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      toast({ title: 'Logout Gagal', description: 'Terjadi kesalahan saat keluar.', variant: 'destructive' });
    }
  };

  // Jangan render layout jika sedang loading auth atau jika belum login dan bukan di halaman login
  if (authLoading) {
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memverifikasi sesi...</p>
      </div>
    );
  }

  if (!currentUser && pathname !== '/login') {
    // Ini akan ditangani oleh useEffect di atas, tapi bisa juga return null atau loading state lain
    return (
         <div className="flex flex-col items-center justify-center h-screen">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-xl text-muted-foreground">Mengarahkan ke halaman login...</p>
        </div>
    );
  }
  
  // Jika pengguna sudah login atau berada di halaman login, tampilkan layout atau halaman login
  if (pathname === '/login') {
    return <>{children}<Toaster /></>; // Hanya render children (halaman login) dan Toaster
  }

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" side="left">
        <SidebarHeader className="p-4">
          <Link href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <AppLogo className="h-8 w-8 text-primary" />
            <span className="font-semibold text-lg text-primary group-data-[collapsible=icon]:hidden">
              RiskWise
            </span>
          </Link>
        </SidebarHeader>
        <Separator className="group-data-[collapsible=icon]:hidden" />
        <SidebarContent>
          <SidebarNav />
        </SidebarContent>
        <Separator className="group-data-[collapsible=icon]:hidden" />
        <SidebarFooter className="p-2 group-data-[collapsible=icon]:hidden">
          <div className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} RiskWise
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            {currentUpr && currentPeriodDisplay && (
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold">UPR:</span> {currentUpr} | <span className="font-semibold">Periode:</span> {currentPeriodDisplay}
              </div>
            )}
          </div>
          {currentUser && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={currentUser.photoURL || "https://placehold.co/100x100.png"} alt={currentUser.displayName || currentUser.email || "User"} data-ai-hint="profile person" />
                    <AvatarFallback>{currentUser.email ? currentUser.email.substring(0, 2).toUpperCase() : 'RW'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{currentUser.displayName || currentUser.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Pengaturan</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Keluar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </header>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
