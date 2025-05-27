
"use client";

import React, { useState, useEffect } from "react";
import NextLink from 'next/link'; // Tetap gunakan alias jika ada next-intl Link
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from "next-themes";
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
import { LogOut, User, Settings as SettingsIcon, Loader2, Sun, Moon } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";

const DEFAULT_FALLBACK_UPR_ID = 'UPR Pengguna';
const DEFAULT_PERIOD = new Date().getFullYear().toString();

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, appUser, loading: authLoading, refreshAppUser } = useAuth(); // Ambil appUser dari context
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();

  const currentUprDisplay = appUser?.displayName || appUser?.uprId || DEFAULT_FALLBACK_UPR_ID;
  const currentPeriodDisplay = appUser?.activePeriod || DEFAULT_PERIOD;

  useEffect(() => {
    console.log("[AppLayout] useEffect triggered. authLoading:", authLoading, "currentUser:", !!currentUser, "appUser:", !!appUser, "pathname:", pathname);
    const publicPaths = ['/login', '/register']; // Halaman profil setup tidak lagi di sini, akan dihandle terpisah
    const profileSetupPath = '/profile-setup';

    if (!authLoading) {
      if (currentUser) {
        // Pengguna sudah login
        if (!appUser) {
          // Data AppUser masih dimuat atau tidak ada, jangan lakukan apa-apa di sini, tunggu AuthContext
          console.log("[AppLayout] User logged in, but appUser is still null/undefined. AuthContext should handle fetching.");
          // Potensi menampilkan loading global jika appUser sedang difetch dan penting untuk layout
        } else {
          // AppUser sudah ada
          const isProfileComplete = appUser.displayName && appUser.uprId && appUser.activePeriod && appUser.availablePeriods && appUser.availablePeriods.length > 0;
          console.log("[AppLayout] appUser exists. Profile complete:", isProfileComplete);

          if (!isProfileComplete && pathname !== profileSetupPath) {
            console.log("[AppLayout] Profile incomplete, redirecting to /profile-setup from", pathname);
            router.push(profileSetupPath);
          } else if (isProfileComplete && pathname === profileSetupPath) {
            console.log("[AppLayout] Profile complete and on setup page, redirecting to /");
            router.push('/');
          } else if (publicPaths.includes(pathname)) {
             console.log("[AppLayout] User logged in but on public path, redirecting to /");
            router.push('/');
          }
        }
      } else {
        // Pengguna belum login
        if (!publicPaths.includes(pathname) && pathname !== profileSetupPath) {
          console.log("[AppLayout] User not logged in and not on public/setup path, redirecting to /login from", pathname);
          router.push('/login');
        }
      }
    }
  }, [currentUser, appUser, authLoading, router, pathname]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Keluar Berhasil', description: 'Anda telah berhasil keluar.' });
      // refreshAppUser(); // Reset appUser di context setelah logout (opsional, karena onAuthStateChanged akan handle)
      router.push('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      toast({ title: 'Gagal Keluar', description: 'Terjadi kesalahan saat keluar.', variant: 'destructive' });
    }
  };

  // State loading global berdasarkan AuthContext
  if (authLoading) {
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memverifikasi sesi...</p>
        <Toaster />
      </div>
    );
  }

  // Jika pengguna ada, tetapi appUser belum ada (masih loading dari Firestore setelah auth state berubah)
  // Ini adalah state antara setelah Firebase Auth selesai tapi sebelum data Firestore user terambil
  if (currentUser && !appUser) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Memuat data profil pengguna...</p>
        <Toaster />
      </div>
    );
  }

  // Jika tidak ada currentUser DAN path saat ini adalah halaman publik (login/register)
  // atau jika sedang di halaman profile-setup (karena halaman ini punya layout sendiri)
  const isPublicPathForUnauthenticated = ['/login', '/register'].includes(pathname);
  if ((!currentUser && isPublicPathForUnauthenticated) || pathname === '/profile-setup') {
    console.log("[AppLayout] Rendering only children for path:", pathname);
    return <>{children}<Toaster /></>;
  }
  
  // Jika tidak ada currentUser dan bukan di halaman publik atau profile-setup,
  // seharusnya redirect ke login sudah terjadi. Jika belum, tampilkan loading.
  if (!currentUser) {
    console.log("[AppLayout] No currentUser and not on a public/setup path, showing loading/redirecting...");
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mengarahkan...</p>
        <Toaster />
      </div>
    );
  }
  
  // Pada titik ini, currentUser ada, appUser ada, dan profil seharusnya lengkap
  // atau pengguna berada di halaman profile-setup yang ditangani oleh kondisi di atas.
  // Jika profil tidak lengkap dan bukan di /profile-setup, redirect seharusnya sudah terjadi.

  return (
    <SidebarProvider defaultOpen>
      <Sidebar variant="sidebar" collapsible="icon" side="left">
        <SidebarHeader className="p-4">
          <NextLink href="/" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
            <AppLogo className="h-8 w-8 text-primary" />
            <span className="font-semibold text-lg text-primary group-data-[collapsible=icon]:hidden">
              RiskWise
            </span>
          </NextLink>
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
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            {appUser && (
              <div className="text-sm text-muted-foreground">
                <span className="font-semibold">UPR:</span> {currentUprDisplay} | <span className="font-semibold">Periode:</span> {currentPeriodDisplay}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  {theme === 'light' ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
                  <span className="sr-only">Ganti tema</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}>
                  Terang
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}>
                  Gelap
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}>
                  Sistem
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {currentUser && appUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={appUser.photoURL || currentUser.photoURL || "https://placehold.co/100x100.png"} alt={appUser.displayName || currentUser.displayName || currentUser.email || "User"} data-ai-hint="profile person" />
                      <AvatarFallback>{(appUser.displayName || currentUser.displayName || currentUser.email || "RW").substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{appUser.displayName || currentUser.displayName || currentUser.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NextLink href="/settings">
                      <SettingsIcon className="mr-2 h-4 w-4" />
                      <span>Pengaturan</span>
                    </NextLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Keluar</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
