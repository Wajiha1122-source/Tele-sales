"use client";
import Shell from "../../components/Shell";
import ExecutiveWorkspace from "../../components/ExecutiveWorkspace";
import ManagerDashboard from "../../components/ManagerDashboard";
import CeoDashboard from "../../components/CeoDashboard";
import { useSession } from "../../hooks/useSession";

export default function DashboardPage() {
  const user = useSession();
  if (!user) return null;
  const dashboard = {
    EXECUTIVE: <ExecutiveWorkspace />,
    MANAGER: <ManagerDashboard />,
    CEO: <CeoDashboard />
  }[user.role];
  return <Shell user={user}>{dashboard}</Shell>;
}
