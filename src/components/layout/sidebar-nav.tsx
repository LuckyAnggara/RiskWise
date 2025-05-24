
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
  matchSegments?: number;
}

export function SidebarNav() {
  const t = useTranslations('SidebarNav');
  const pathname = usePathname();
  const { openMobile, setOpenMobile } = useSidebar();

  // Remove locale from pathname for comparison
  const cleanPathname = pathname.replace(/^\/(en|id)/, '') || '/';

  const navItems: NavItem[] = [
    { key: "dashboard", href: "/", icon: LayoutDashboard, matchSegments: 1 },
    { key: "goals", href: "/goals", icon: Target, matchSegments: 1 },
    { key: "allRisks", href: "/all-risks", icon: ListChecks, matchSegments: 1 },
    { key: "settings", href: "/settings", icon: Cog, matchSegments: 1 },
  ];
  
  const isActive = (href: string, matchSegments: number = 1) => {
    // Special case for the root path
    if (href === "/") return cleanPathname === "/";
  
    const pathSegments = cleanPathname.split("/").filter(Boolean);
    const hrefSegments = href.split("/").filter(Boolean);
    
    if (pathSegments.length < matchSegments || hrefSegments.length < matchSegments) return false;
    
    // Ensure exact match for top-level items if matchSegments is 1
    if (matchSegments === 1 && pathSegments.length > hrefSegments.length && href !== "/") return false;
  
    for (let i = 0; i < matchSegments; i++) {
      if (pathSegments[i] !== hrefSegments[i]) return false;
    }
    return true;
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
                isActive={isActive(item.href, item.matchSegments)}
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
