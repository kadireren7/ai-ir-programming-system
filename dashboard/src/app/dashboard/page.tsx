import type { Metadata } from "next";
import { CommandCenter } from "@/components/dashboard/command-center";

export const metadata: Metadata = {
  title: "Command Center",
  description: "Live governance state — decisions, queue, policies.",
};

export default function DashboardPage() {
  return <CommandCenter />;
}
