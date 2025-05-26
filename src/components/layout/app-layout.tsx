
"use client";

import React, { useState, useEffect } from "react";
import Link from 'next/link'; 
import { usePathname, useRouter } from 'next/navigation';
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
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [currentUpr, setCurrentUpr] = useState('');
  const [currentPeriodDisplay, setCurrentPeriodDisplay] = useState('');
  const { currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const context = initializeAppContext();
    setCurrentUpr(context.uprId);
    setCurrentPeriodDisplay(context.period);
  }, []);

  useEffect(() => {
    const publicPaths = ['/login', '/register'];
    if (!authLoading) {
      if (!currentUser && !publicPaths.includes(pathname)) {
        router.push('/login');
      } else if (currentUser && publicPaths.includes(pathname)) {
        router.push('/'); // Arahkan pengguna yang sudah login dari halaman login/register
      }
    }
  }, [currentUser, authLoading, router, pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Keluar Berhasil', description: 'Anda telah berhasil keluar.' });
      router.push('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      toast({ title: 'Gagal Keluar', description: 'Terjadi kesalahan saat keluar.', variant: 'destructive' });
    }
  };

  if (authLoading) {
     return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memverifikasi sesi...</p>
      </div>
    );
  }

  // Jika tidak loading dan pengguna tidak ada, tetapi path adalah publik, izinkan children (login/register page)
  if (!currentUser && (pathname === '/login' || pathname === '/register')) {
    return <>{children}<Toaster /></>;
  }

  // Jika tidak loading dan pengguna tidak ada, dan bukan path publik (sudah ditangani redirect di useEffect)
  // atau jika pengguna ada, tampilkan layout lengkap.
  if (!currentUser && !['/login', '/register'].includes(pathname)) {
    // Pengguna seharusnya sudah diarahkan, tapi ini sebagai fallback
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mengarahkan...</p>
      </div>
    );
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
