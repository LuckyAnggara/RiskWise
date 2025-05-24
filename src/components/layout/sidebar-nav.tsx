
"use client";

import {Link} from 'next-intl/link'; // Changed import
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
import { useTranslations } from 'next-intl';

interface NavItem {
  key: string; 
  href: string;
  icon: React.ElementType;
}

export function SidebarNav() {
  const t = useTranslations('SidebarNav');
  const pathname = usePathname(); 
  const { openMobile, setOpenMobile } = useSidebar();

  const cleanPathname = pathname.replace(/^\/(en|id)/, '') || '/';

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
    return cleanPathname.startsWith(navHref) && 
           (cleanPathname.length === navHref.length || cleanPathname[navHref.length] === '/');
  };

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>{t('menu')}</SidebarGroupLabel>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href}> {/* Removed legacyBehavior and passHref */}
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

