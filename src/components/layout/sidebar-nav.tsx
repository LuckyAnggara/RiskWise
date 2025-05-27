
"use client";

import NextLink from 'next/link'; // Menggunakan alias jika Link dari next-intl bentrok
import { usePathname } from "next/navigation"; 
import { useLocale } from 'next-intl'; // Untuk mendapatkan locale saat ini
import { LayoutDashboard, Target, ListChecks, Cog, BarChart3, Edit, ShieldCheck } from "lucide-react"; 
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavItem {
  labelKey: string; // Kunci untuk terjemahan
  href: string; 
  icon: React.ElementType;
  disabled?: boolean; // Properti baru untuk menonaktifkan menu
}

// Dummy t function jika useTranslations tidak tersedia atau error
const tFallback = (key: string) => key.split('.').pop() || key;

export function SidebarNav({ profileIncomplete }: { profileIncomplete?: boolean }) {
  const pathname = usePathname(); 
  const { openMobile, setOpenMobile } = useSidebar();
  const locale = useLocale();
  
  // Dummy useTranslations jika error
  let t = tFallback;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    t = (require('next-intl').useTranslations)('SidebarNav');
  } catch (e) {
    console.warn("Failed to load useTranslations in SidebarNav, using fallback.");
  }


  const navItems: NavItem[] = [
    { labelKey: "dashboard", href: "/", icon: LayoutDashboard, disabled: profileIncomplete },
    { labelKey: "goals", href: "/goals", icon: Target, disabled: profileIncomplete },
    { labelKey: "allRisks", href: "/all-risks", icon: Edit, disabled: profileIncomplete }, 
    { labelKey: "riskAnalysis", href: "/risk-analysis", icon: BarChart3, disabled: profileIncomplete }, 
    { labelKey: "riskPriority", href: "/risk-priority", icon: ShieldCheck, disabled: profileIncomplete },
    { labelKey: "settings", href: "/settings", icon: Cog, disabled: false }, // Settings selalu aktif
  ];
  
  const isActive = (navHref: string) => {
    const currentPathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";
    const targetHrefWithoutLocale = navHref.startsWith(`/${locale}`) ? navHref.replace(`/${locale}`, "") || "/" : navHref;

    if (targetHrefWithoutLocale === "/") {
      return currentPathWithoutLocale === "/";
    }
    return currentPathWithoutLocale.startsWith(targetHrefWithoutLocale);
  };

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>{t('menu')}</SidebarGroupLabel>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <NextLink href={item.href} passHref legacyBehavior={item.disabled ? undefined : true}>
              <SidebarMenuButton
                as={item.disabled ? "button" : "a"} // Gunakan button jika disabled
                isActive={!item.disabled && isActive(item.href)}
                tooltip={t(item.labelKey)}
                onClick={() => {
                  if (openMobile) setOpenMobile(false);
                  if (item.disabled) {
                    // Mungkin tambahkan toast di sini untuk memberitahu pengguna
                    console.log(`Menu ${t(item.labelKey)} dinonaktifkan karena profil belum lengkap.`);
                  }
                }}
                disabled={item.disabled}
                className={cn(item.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-sidebar-foreground")}
              >
                <item.icon className="h-5 w-5" />
                <span>{t(item.labelKey)}</span>
              </SidebarMenuButton>
            </NextLink>
          </SidebarMenuItem>
        ))}
      </SidebarGroup>
    </SidebarMenu>
  );
}
