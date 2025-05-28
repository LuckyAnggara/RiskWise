
"use client";

import React, { useEffect } from "react";
import NextLink from 'next/link'; // Menggunakan Link standar dari Next.js
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
import { LogOut, Settings as SettingsIcon, Loader2, Sun, Moon, AlertTriangle } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from '@/contexts/auth-context';
import { auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppStore } from '@/stores/useAppStore';

const DEFAULT_FALLBACK_UPR_ID = 'Pengguna';
const DEFAULT_PERIOD = new Date().getFullYear().toString();

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { currentUser, appUser, loading: authContextLoading, isProfileComplete, refreshAppUser } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();
  const triggerInitialDataFetch = useAppStore(state => state.triggerInitialDataFetch);

  const currentUprDisplay = appUser?.displayName || DEFAULT_FALLBACK_UPR_ID;
  const currentPeriodDisplay = appUser?.activePeriod || DEFAULT_PERIOD;

  useEffect(() => {
    console.log("[AppLayout] useEffect for redirection triggered. authContextLoading:", authContextLoading, "CurrentUser:", !!currentUser, "AppUser:", !!appUser, "isProfileComplete:", isProfileComplete, "Pathname:", pathname);
    const publicPaths = ['/login', '/register'];
    const profileSetupPath = '/profile-setup';
    const settingsPath = '/settings';

    if (!authContextLoading) {
      if (currentUser) {
        if (appUser === undefined) {
          console.log("[AppLayout] appUser is undefined, AuthContext still resolving profile.");
          return;
        }
        
        if (!isProfileComplete && pathname !== profileSetupPath && pathname !== settingsPath) {
          console.log("[AppLayout] Profile incomplete, redirecting to", profileSetupPath, "from", pathname);
          router.push(profileSetupPath);
        } else if (isProfileComplete && (publicPaths.includes(pathname) || pathname === profileSetupPath)) {
          console.log("[AppLayout] Profile complete and on public/setup path, redirecting to / from", pathname);
          router.push('/');
        } else if (isProfileComplete && appUser && appUser.uid && appUser.activePeriod) {
          console.log("[AppLayout] Profile complete. Triggering initial data fetch for user:", appUser.uid, "period:", appUser.activePeriod);
          triggerInitialDataFetch(appUser.uid, appUser.activePeriod);
        }

      } else { 
        if (!publicPaths.includes(pathname) && pathname !== profileSetupPath) {
          console.log("[AppLayout] User not logged in and not on public/setup path, redirecting to /login from", pathname);
          router.push('/login');
        }
      }
    }
  }, [currentUser, appUser, authContextLoading, isProfileComplete, router, pathname, triggerInitialDataFetch]);


  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Keluar Berhasil', description: 'Anda telah berhasil keluar.' });
      useAppStore.getState().resetAllData(); // Reset Zustand store on logout
      router.push('/login');
    } catch (error) {
      console.error("Error logging out:", error);
      toast({ title: 'Gagal Keluar', description: 'Terjadi kesalahan saat keluar.', variant: 'destructive' });
    }
  };

  if (authContextLoading || (currentUser && appUser === undefined && !authContextLoading)) { 
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">
          {authContextLoading && !currentUser ? "Memverifikasi sesi..." : 
           currentUser && appUser === undefined ? "Memuat data profil pengguna..." : 
           "Menyiapkan aplikasi..."}
        </p>
        <Toaster />
      </div>
    );
  }

  const isAuthPage = ['/login', '/register'].includes(pathname);
  const isSetupPage = pathname === '/profile-setup';

  if (!currentUser && (isAuthPage || isSetupPage)) {
    return <>{children}<Toaster /></>;
  }
  
  if (!currentUser && !isAuthPage && !isSetupPage) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Mengarahkan ke halaman login...</p>
        <Toaster />
      </div>
    );
  }
  
  if (currentUser && !isProfileComplete && isSetupPage) {
    return <>{children}<Toaster /></>;
  }
  
  if (currentUser && !isProfileComplete && !isSetupPage && pathname !== '/settings') {
     // Redirection to /profile-setup is handled by useEffect.
     // Show loading or minimal layout while redirecting.
     return (
      <div className="flex flex-col items-center justify-center h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-xl text-muted-foreground">Profil belum lengkap, mengarahkan...</p>
        <Toaster />
      </div>
    );
  }


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
          <SidebarNav profileIncomplete={currentUser ? !isProfileComplete : false} />
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
                <span className="font-semibold">UPR:</span> {appUser.displayName || DEFAULT_FALLBACK_UPR_ID} | <span className="font-semibold">Periode:</span> {appUser.activePeriod || DEFAULT_PERIOD}
              </div>
            )}
             {appUser && !appUser.activePeriod && isProfileComplete && ( // Hanya tampilkan jika profil lengkap tapi periode belum ada
                <div className="text-sm text-muted-foreground">
                    <span className="font-semibold">UPR:</span> {appUser.displayName || DEFAULT_FALLBACK_UPR_ID} | <span className="font-semibold text-orange-500">Periode Belum Diatur</span>
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

            {currentUser && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={appUser?.photoURL || currentUser.photoURL || "https://placehold.co/100x100.png"} alt={appUser?.displayName || currentUser.displayName || currentUser.email || "Pengguna"} data-ai-hint="profile person" />
                      <AvatarFallback>{(appUser?.displayName || currentUser.displayName || currentUser.email || "RW").substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{appUser?.displayName || currentUser.displayName || currentUser.email}</DropdownMenuLabel>
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
          {currentUser && !isProfileComplete && !isSetupPage && pathname !== '/settings' && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Profil Belum Lengkap!</AlertTitle>
              <AlertDescription>
                Nama UPR dan Periode Awal Anda belum diatur. Harap lengkapi profil Anda di halaman 
                <NextLink href="/settings" className="font-semibold underline hover:text-destructive-foreground/80 ml-1">
                  Pengaturan
                </NextLink>
                {' '}untuk dapat menggunakan fitur lain.
              </AlertDescription>
            </Alert>
          )}
          {children}
        </main>
        <Toaster />
      </SidebarInset>
    </SidebarProvider>
  );
}
