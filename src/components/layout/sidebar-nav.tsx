
"use client";

import NextLink from 'next/link';
import { usePathname } from "next/navigation"; 
import { LayoutDashboard, Target, ListChecks, Cog, BarChart3, Edit, ShieldCheck, FileText } from "lucide-react"; 
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
  disabled?: boolean;
}

export function SidebarNav({ profileIncomplete }: { profileIncomplete?: boolean }) {
  const pathname = usePathname(); 
  const { openMobile, setOpenMobile } = useSidebar();
  
  const navItems: NavItem[] = [
    { label: "Dasbor", href: "/", icon: LayoutDashboard, disabled: profileIncomplete },
    { label: "Sasaran", href: "/goals", icon: Target, disabled: profileIncomplete },
    { label: "Identifikasi Risiko", href: "/all-risks", icon: FileText, disabled: profileIncomplete }, 
    { label: "Analisis Risiko", href: "/risk-analysis", icon: BarChart3, disabled: profileIncomplete }, 
    { label: "Prioritas Risiko", href: "/risk-priority", icon: ShieldCheck, disabled: profileIncomplete },
    { label: "Pengaturan", href: "/settings", icon: Cog, disabled: false }, 
  ];
  
  const isActive = (navHref: string) => {
    // Untuk halaman utama ('/'), path harus sama persis.
    // Untuk halaman lain, path saat ini harus dimulai dengan href item navigasi.
    if (navHref === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(navHref);
  };

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Menu</SidebarGroupLabel>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <NextLink href={item.href} passHref legacyBehavior={item.disabled ? undefined : true}>
              <SidebarMenuButton
                as={item.disabled ? "button" : "a"}
                isActive={!item.disabled && isActive(item.href)}
                // Tooltip dihilangkan karena tidak lagi menggunakan terjemahan dinamis
                onClick={() => {
                  if (openMobile) setOpenMobile(false);
                  if (item.disabled) {
                    console.log(`Menu ${item.label} dinonaktifkan karena profil belum lengkap.`);
                  }
                }}
                disabled={item.disabled}
                className={cn(item.disabled && "cursor-not-allowed opacity-50 hover:bg-transparent hover:text-sidebar-foreground")}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.label}</span>
              </SidebarMenuButton>
            </NextLink>
          </SidebarMenuItem>
        ))}
      </SidebarGroup>
    </SidebarMenu>
  );
}
