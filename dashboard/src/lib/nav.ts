import {
  LayoutDashboard,
  Shield,
  Users,
  FolderKanban,
  History,
  Radar,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { title: "Overview", href: "/", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Scan", href: "/scan", icon: Radar },
  { title: "Scan history", href: "/scan/history", icon: ClipboardList },
  { title: "Validation", href: "/validation", icon: History },
  { title: "Policies", href: "/policy", icon: Shield },
  { title: "Team", href: "/team", icon: Users },
];

export function titleForPath(pathname: string): string {
  if (pathname === "/") return "Overview";
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/scan/history")) return "Scan history";
  if (pathname.startsWith("/scan/")) return "Scan report";
  if (pathname.startsWith("/scan")) return "Scan";
  if (pathname.startsWith("/validation")) return "Validation";
  if (pathname.startsWith("/policy")) return "Policies";
  if (pathname.startsWith("/team")) return "Team";
  return "Torqa";
}
