import {
  LayoutDashboard,
  Shield,
  Users,
  FolderKanban,
  History,
  Radar,
  Plug,
  ClipboardList,
  Library,
  Bell,
  KeyRound,
  CalendarClock,
  Megaphone,
  LineChart,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
};

export const mainNav: NavItem[] = [
  { title: "Overview", href: "/overview", icon: LayoutDashboard },
  { title: "Insights", href: "/insights", icon: LineChart },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Scan", href: "/scan", icon: Radar },
  { title: "Integrations", href: "/integrations", icon: Plug },
  { title: "Schedules", href: "/schedules", icon: CalendarClock },
  { title: "Workflow library", href: "/workflow-library", icon: Library },
  { title: "Scan history", href: "/scan/history", icon: ClipboardList },
  { title: "Validation", href: "/validation", icon: History },
  { title: "Policies", href: "/policies", icon: Shield },
  { title: "Workspace", href: "/workspace", icon: Users },
  { title: "Workspace activity", href: "/workspace/activity", icon: History },
  { title: "Notifications", href: "/notifications", icon: Bell },
  { title: "Alerts", href: "/alerts", icon: Megaphone },
  { title: "User API", href: "/settings/api", icon: KeyRound },
];

export function titleForPath(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname === "/overview") return "Overview";
  if (pathname.startsWith("/insights")) return "Insights";
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/scan/history")) return "Scan history";
  if (pathname.startsWith("/scan/")) return "Scan report";
  if (pathname.startsWith("/scan")) return "Scan";
  if (pathname.startsWith("/integrations")) return "Integrations";
  if (pathname.startsWith("/schedules")) return "Scheduled scans";
  if (pathname.startsWith("/workflow-library")) return "Workflow library";
  if (pathname.startsWith("/validation")) return "Validation";
  if (pathname.startsWith("/policies")) return "Policy templates";
  if (pathname.startsWith("/policy")) return "Policy settings";
  if (pathname.startsWith("/workspace/activity")) return "Workspace activity";
  if (pathname.startsWith("/workspace")) return "Workspace";
  if (pathname.startsWith("/settings/api")) return "User API";
  if (pathname.startsWith("/settings/notifications")) return "Alert settings";
  if (pathname.startsWith("/notifications")) return "Notifications";
  if (pathname.startsWith("/alerts")) return "Alerts";
  return "Torqa";
}
