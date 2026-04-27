import {
  LayoutDashboard,
  Shield,
  Users,
  FolderKanban,
  History,
  Radar,
  ClipboardList,
  Library,
  Bell,
  KeyRound,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { title: "Overview", href: "/overview", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Scan", href: "/scan", icon: Radar },
  { title: "Workflow library", href: "/workflow-library", icon: Library },
  { title: "Scan history", href: "/scan/history", icon: ClipboardList },
  { title: "Validation", href: "/validation", icon: History },
  { title: "Policies", href: "/policy", icon: Shield },
  { title: "Workspace", href: "/workspace", icon: Users },
  { title: "Workspace activity", href: "/workspace/activity", icon: History },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "User API", href: "/settings/api", icon: KeyRound },
];

export function titleForPath(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname === "/overview") return "Overview";
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/scan/history")) return "Scan history";
  if (pathname.startsWith("/scan/")) return "Scan report";
  if (pathname.startsWith("/scan")) return "Scan";
  if (pathname.startsWith("/workflow-library")) return "Workflow library";
  if (pathname.startsWith("/validation")) return "Validation";
  if (pathname.startsWith("/policy")) return "Policies";
  if (pathname.startsWith("/workspace/activity")) return "Workspace activity";
  if (pathname.startsWith("/workspace")) return "Workspace";
  if (pathname.startsWith("/settings/api")) return "User API";
  if (pathname.startsWith("/settings/notifications")) return "Alert settings";
  if (pathname.startsWith("/notifications")) return "Notifications";
  return "Torqa";
}
