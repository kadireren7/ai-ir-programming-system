import {
  LayoutDashboard,
  Shield,
  Users,
  FolderKanban,
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
  badge?: "beta";
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const mainNavSections: NavSection[] = [
  {
    title: "Core",
    items: [
      { title: "Overview", href: "/overview", icon: LayoutDashboard },
      { title: "Scan", href: "/scan", icon: Radar },
      { title: "Scan results", href: "/scan/history", icon: ClipboardList },
      { title: "Workflow library", href: "/workflow-library", icon: Library },
      { title: "Policies", href: "/policies", icon: Shield },
    ],
  },
  {
    title: "Operate",
    items: [
      { title: "Insights", href: "/insights", icon: LineChart },
      { title: "Projects", href: "/projects", icon: FolderKanban },
      { title: "Workspace", href: "/workspace", icon: Users },
      { title: "Notifications", href: "/notifications", icon: Bell },
      { title: "Alerts", href: "/alerts", icon: Megaphone, badge: "beta" },
      { title: "Integrations", href: "/integrations", icon: Plug, badge: "beta" },
      { title: "Schedules", href: "/schedules", icon: CalendarClock, badge: "beta" },
      { title: "User API", href: "/settings/api", icon: KeyRound, badge: "beta" },
    ],
  },
];

export function titleForPath(pathname: string): string {
  if (pathname === "/") return "Home";
  if (pathname === "/overview") return "Overview";
  if (pathname.startsWith("/insights")) return "Insights";
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/scan/history")) return "Scan results";
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
  if (pathname.startsWith("/settings/notifications")) return "Alerts";
  if (pathname.startsWith("/notifications")) return "Notifications";
  if (pathname.startsWith("/alerts")) return "Alerts";
  return "Torqa";
}
