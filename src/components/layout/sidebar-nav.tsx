
"use client";

import NextLink from 'next/link'; // Using NextLink to avoid conflict
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, ListChecks, Cog } from "lucide-react"; 
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTranslations, useLocale } from 'next-intl';

interface NavItem {
  key: string; 
  href: string; // Base href, without locale
  icon: React.ElementType;
}

export function SidebarNav() {
  const t = useTranslations('SidebarNav');
  const pathname = usePathname(); // Full path with locale
  const locale = useLocale();
  const { openMobile, setOpenMobile } = useSidebar();

  const cleanPathname = pathname.startsWith(`/${locale}`) ? pathname.substring(`/${locale}`.length) || '/' : pathname;

  const navItems: NavItem[] = [
    { key: "dashboard", href: "/", icon: LayoutDashboard },
    { key: "goals", href: "/goals", icon: Target },
    { key: "allRisks", href: "/all-risks", icon: ListChecks },
    { key: "settings", href: "/settings", icon: Cog },
  ];
  
  const isActive = (navHref: string) => {
    if (navHref === "/") {
      return cleanPathname === "/";
    }
    // Check if the current path starts with the nav item's href
    // and is either an exact match or followed by a '/' (for sub-pages)
    return cleanPathname.startsWith(navHref) && 
           (cleanPathname.length === navHref.length || cleanPathname[navHref.length] === '/');
  };

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>{t('menu')}</SidebarGroupLabel>
        {navItems.map((item) => {
          // Construct the full href with locale for next/link
          const fullHref = `/${locale}${item.href === "/" ? "" : item.href}`;
          return (
            <SidebarMenuItem key={item.href}>
              <NextLink href={fullHref} passHref legacyBehavior>
                <SidebarMenuButton
                  as="a" // Ensure SidebarMenuButton renders as an 'a' tag due to legacyBehavior
                  isActive={isActive(item.href)}
                  tooltip={t(item.key)}
                  onClick={() => {
                    if (openMobile) setOpenMobile(false);
                  }}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{t(item.key)}</span>
                </SidebarMenuButton>
              </NextLink>
            </SidebarMenuItem>
          );
        })}
      </SidebarGroup>
    </SidebarMenu>
  );
}
