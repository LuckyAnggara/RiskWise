
"use client";

import Link from 'next/link';
import { usePathname } from "next/navigation"; 
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
  label: string; 
  href: string; 
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: "Dasbor", href: "/", icon: LayoutDashboard },
  { label: "Sasaran", href: "/goals", icon: Target },
  { label: "Identifikasi Risiko", href: "/all-risks", icon: Edit }, 
  { label: "Analisis Risiko", href: "/risk-analysis", icon: BarChart3 }, 
  { label: "Prioritas Risiko", href: "/risk-priority", icon: ShieldCheck },
  { label: "Pengaturan", href: "/settings", icon: Cog },
];

export function SidebarNav() {
  const pathname = usePathname(); 
  const { openMobile, setOpenMobile } = useSidebar();
  
  const isActive = (navHref: string) => {
    if (navHref === "/") {
      return pathname === "/" || pathname === "" ; 
    }
    return pathname.startsWith(navHref);
  };

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Menu</SidebarGroupLabel>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                as="a"
                isActive={isActive(item.href)}
                tooltip={item.label}
                onClick={() => {
                  if (openMobile) setOpenMobile(false);
                }}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarGroup>
    </SidebarMenu>
  );
}

    