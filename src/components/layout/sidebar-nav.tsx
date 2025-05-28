
"use client";

import Link from 'next/link';
import { usePathname } from "next/navigation"; 
import { LayoutDashboard, Target, ListChecks, Cog, BarChart3, ShieldCheck, Activity, Edit } from "lucide-react"; 
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
    { label: "Identifikasi Risiko", href: "/all-risks", icon: ListChecks, disabled: profileIncomplete }, 
    { label: "Analisis Risiko", href: "/risk-analysis", icon: BarChart3, disabled: profileIncomplete }, 
    { label: "Prioritas Risiko", href: "/risk-priority", icon: ShieldCheck, disabled: profileIncomplete },
    { label: "Pemantauan & Reviu", href: "/monitoring", icon: Activity, disabled: profileIncomplete },
    { label: "Pengaturan", href: "/settings", icon: Cog, disabled: false }, 
  ];
  
  const isActive = (navHref: string) => {
    if (navHref === "/") {
      return pathname === "/";
    }
    // Untuk halaman lain, path saat ini harus dimulai dengan href item navigasi.
    // Atau jika path adalah sub-path dari href (misalnya /all-risks/manage/new untuk /all-risks)
    return pathname.startsWith(navHref);
  };

  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Menu</SidebarGroupLabel>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior={item.disabled ? undefined : false}>
              <SidebarMenuButton
                as="a"
                isActive={!item.disabled && isActive(item.href)}
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
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarGroup>
    </SidebarMenu>
  );
}
