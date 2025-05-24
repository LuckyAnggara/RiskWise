
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, ListChecks, Cog } from "lucide-react"; // Added Cog for Settings
import { cn } from "@/lib/utils";
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { useTranslations } from 'next-intl';

interface NavItem {
  key: string; // For translation key
  href: string;
  icon: React.ElementType;
}

export function SidebarNav() {
  const t = useTranslations('SidebarNav');
  const pathname = usePathname(); // Returns full path e.g., /en/goals
  const { openMobile, setOpenMobile } = useSidebar();

  // Remove locale from pathname for comparison e.g., /en/goals -> /goals, or /en -> /
  const cleanPathname = pathname.replace(/^\/(en|id)/, '') || '/';

  const navItems: NavItem[] = [
    { key: "dashboard", href: "/", icon: LayoutDashboard },
    { key: "goals", href: "/goals", icon: Target },
    { key: "allRisks", href: "/all-risks", icon: ListChecks },
    { key: "settings", href: "/settings", icon: Cog },
  ];
  
  const isActive = (navHref: string) => {
    // For the root path, ensure it's an exact match after cleaning
    if (navHref === "/") {
      return cleanPathname === "/";
    }
    // For other paths, check if the cleanPathname starts with the navHref
    // and is either an exact match or followed by a '/'
    // e.g., navHref = /all-risks, cleanPathname = /all-risks/manage/new -> true
    // e.g., navHref = /all-risks, cleanPathname = /all-risks -> true
    // e.g., navHref = /goals, cleanPathname = /all-risks -> false
    return cleanPathname.startsWith(navHref) && 
           (cleanPathname.length === navHref.length || cleanPathname[navHref.length] === '/');
  };

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>{t('menu')}</SidebarGroupLabel>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href)}
                tooltip={t(item.key)}
                onClick={() => {
                  if (openMobile) setOpenMobile(false);
                }}
              >
                <a>
                  <item.icon className="h-5 w-5" />
                  <span>{t(item.key)}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarGroup>
    </SidebarMenu>
  );
}
