import { redirect } from "next/navigation";

// v0.1.7: Integrations renamed to Sources
export default function IntegrationsLegacy() {
  redirect("/sources");
}
