import React from "react";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";

export function App() {
  return (
    <main className="app-shell">
      <h1>HelloDemo</h1>
      <LandingPage />
      <LoginPage />
      <DashboardPage />
    </main>
  );
}
