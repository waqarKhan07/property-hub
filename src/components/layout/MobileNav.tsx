import { NavLink } from "react-router-dom";
import { CalendarClock, Heart, Home, Inbox, Search, UserRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const { user } = useAuth();

  const items = [
    { to: "/", label: "Home", icon: Home, end: true },
    { to: "/search", label: "Search", icon: Search },
    { to: "/favorites", label: "Saved", icon: Heart },
    user
      ? { to: "/inbox", label: "Messages", icon: Inbox }
      : { to: "/login", label: "Login", icon: UserRound },
    user ? { to: "/dashboard", label: "You", icon: UserRound } : { to: "/my-visits", label: "Visits", icon: CalendarClock },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      aria-label="Bottom navigation"
    >
      <div className="grid grid-cols-5">
        {items.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            end={"end" in item ? item.end : undefined}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium",
                isActive ? "text-brand-600" : "text-ink-500",
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}