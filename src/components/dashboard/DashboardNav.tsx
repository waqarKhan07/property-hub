import { NavLink } from "react-router-dom";
import { CalendarClock, Home, Inbox, LayoutDashboard, PlusCircle, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/dashboard/properties", label: "My Properties", icon: Home },
  { to: "/dashboard/properties/new", label: "Add Property", icon: PlusCircle },
  { to: "/dashboard/visits", label: "Visit Requests", icon: CalendarClock },
  { to: "/inbox", label: "Messages", icon: Inbox },
  { to: "/dashboard/profile", label: "Profile", icon: UserRound },
];

export function DashboardNav({ active }: { active?: string }) {
  return (
    <nav aria-label="Dashboard" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {links.map((l) => {
        const isActive = active ? l.to === active : false;
        return (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive: ia }) =>
              cn(
                "flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition",
                (ia || isActive)
                  ? "bg-brand-600 text-white shadow-sm"
                  : "text-ink-700 hover:bg-ink-100",
              )
            }
          >
            <l.icon className="h-4 w-4 shrink-0" />
            {l.label}
          </NavLink>
        );
      })}
    </nav>
  );
}