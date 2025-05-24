
"use client";

import NextLink from 'next/link'; // Use standard Next.js Link, aliased
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
import { useTranslations, useLocale } from 'next-intl'; // useLocale for path construction

interface NavItem {
  key: string; 
  href: string; 
  icon: React.ElementType;
}

export function SidebarNav() {
  const t = useTranslations('SidebarNav');
  const pathname = usePathname(); 
  const { openMobile, setOpenMobile } = useSidebar();
  const locale = useLocale(); // For constructing locale-prefixed paths

  const navItems: NavItem[] = [
    { key: "dashboard", href: "/", icon: LayoutDashboard },
    { key: "goals", href: "/goals", icon: Target },
    { key: "allRisks", href: "/all-risks", icon: ListChecks },
    { key: "settings", href: "/settings", icon: Cog },
  ];
  
  const isActive = (navHref: string) => {
    const localePrefixPattern = /^\/[a-z]{2}(\/|$)/;
    let pathWithoutLocale = pathname.replace(localePrefixPattern, '/');
    // Normalize pathWithoutLocale to always start with a single slash if it's not just "/"
    if (pathWithoutLocale !== '/' && !pathWithoutLocale.startsWith('/')) {
      pathWithoutLocale = `/${pathWithoutLocale}`;
    } else if (pathWithoutLocale === '//') { // case where original pathname was just /en
        pathWithoutLocale = '/';
    }


    const normalizedNavHref = navHref; // Assuming navHref is like "/" or "/goals"

    if (normalizedNavHref === "/") {
      return pathWithoutLocale === "/" || pathWithoutLocale === ""; 
    }
    return pathWithoutLocale.startsWith(normalizedNavHref) && 
           (pathWithoutLocale.length === normalizedNavHref.length || pathWithoutLocale[normalizedNavHref.length] === '/');
  };

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>{t('menu')}</SidebarGroupLabel>
        {navItems.map((item) => {
          // Construct locale-prefixed href for next/link
          const localizedHref = item.href === "/" ? `/${locale}` : `/${locale}${item.href}`;
          return (
            <SidebarMenuItem key={item.href}>
              <NextLink href={localizedHref} passHref legacyBehavior>
                <SidebarMenuButton
                  as="a"
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
