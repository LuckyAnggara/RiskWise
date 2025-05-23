
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Target, Settings, ShieldAlert, Users } from "lucide-react";
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
  href: string;
  label: string;
  icon: React.ElementType;
  matchSegments?: number;
}

const navItems: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, matchSegments: 1 },
  { href: "/goals", label: "Goals", icon: Target, matchSegments: 1 },
  // Example of future items:
  // { href: "/risks", label: "All Risks", icon: ShieldAlert, matchSegments: 1 },
  // { href: "/team", label: "Team", icon: Users, matchSegments: 1 },
  // { href: "/settings", label: "Settings", icon: Settings, matchSegments: 1 },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { openMobile, setOpenMobile } = useSidebar();

  const isActive = (href: string, matchSegments: number = 1) => {
    if (href === "/") return pathname === "/";
    const pathSegments = pathname.split("/").filter(Boolean);
    const hrefSegments = href.split("/").filter(Boolean);
    if (pathSegments.length < matchSegments || hrefSegments.length < matchSegments) return false;
    for (let i = 0; i < matchSegments; i++) {
      if (pathSegments[i] !== hrefSegments[i]) return false;
    }
    return true;
  };


  return (
    <SidebarMenu>
      <SidebarGroup>
        <SidebarGroupLabel>Menu</SidebarGroupLabel>
        {navItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Link href={item.href} passHref legacyBehavior>
              <SidebarMenuButton
                asChild
                isActive={isActive(item.href, item.matchSegments)}
                tooltip={item.label}
                onClick={() => {
                  if (openMobile) setOpenMobile(false);
                }}
              >
                <a>
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        ))}
      </SidebarGroup>
    </SidebarMenu>
  );
}
