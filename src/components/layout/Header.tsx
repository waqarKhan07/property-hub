import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  Search,
  UserRound,
  Heart,
  Menu,
  X,
  Inbox,
  CalendarClock,
  Bell,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { cn, initials } from "@/lib/utils";
import { BackendStatusBanner } from "@/components/auth/BackendStatusBanner";

const mainNav = [
  { to: "/search?listing_type=rent", label: "Rent" },
  { to: "/search?listing_type=sale", label: "Buy" },
];

function AvatarMenu() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const links = [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/favorites", label: "Saved Properties", icon: Heart },
    { to: "/inbox", label: "Messages", icon: Inbox },
    { to: "/my-visits", label: "My Visits", icon: CalendarClock },
    { to: "/notifications", label: "Notifications", icon: Bell },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-ink-100"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">
          {initials(profile?.full_name ?? profile?.email)}
        </span>
        <ChevronDown className={cn("h-4 w-4 text-ink-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-12 z-50 w-60 animate-menu-in overflow-hidden rounded-xl border border-ink-200 bg-white py-2 shadow-xl">
          <div className="border-b border-ink-100 px-4 pb-2 pt-1">
            <p className="truncate text-sm font-semibold text-ink-900">
              {profile?.full_name || "RentHub member"}
            </p>
            <p className="truncate text-xs text-ink-500">{profile?.email}</p>
          </div>
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-ink-700 hover:bg-ink-50"
            >
              <l.icon className="h-4 w-4 text-ink-400" />
              {l.label}
            </Link>
          ))}
          <div className="border-t border-ink-100 pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={async () => {
                setOpen(false);
                await supabase.auth.signOut();
                navigate("/");
              }}
              className="flex w-full items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 border-b bg-white/90 backdrop-blur transition-shadow",
        scrolled ? "border-ink-200 shadow-sm" : "border-ink-200/70",
      )}
    >
      <BackendStatusBanner />
      <div className="container-app flex h-16 items-center justify-between gap-3">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {mainNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive ? "bg-brand-50 text-brand-700" : "text-ink-700 hover:bg-ink-100 hover:text-ink-900",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/search"
            className="rounded-lg px-3 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            All Properties
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/search" className="lg:hidden">
            <Button variant="ghost" size="icon" aria-label="Search">
              <Search className="h-5 w-5" />
            </Button>
          </Link>

          <div className="hidden items-center gap-2 md:flex">
            <Link to="/dashboard/properties/new">
              <Button variant="primary" size="sm" className="h-10">
                <PlusCircle className="h-4 w-4" />
                List Property
              </Button>
            </Link>
          </div>

          {user ? (
            <AvatarMenu />
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <Link to="/login">
                <Button variant="ghost" size="sm" className="h-10">
                  <UserRound className="h-4 w-4" />
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" size="sm" className="h-10">
                  Sign up
                </Button>
              </Link>
            </div>
          )}

          <button
            type="button"
            className="rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden"
            aria-label={drawerOpen ? "Close menu" : "Open menu"}
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((v) => !v)}
          >
            {drawerOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {drawerOpen && (
        <nav className="animate-sheet-in border-t border-ink-100 bg-white px-4 py-3 lg:hidden" aria-label="Mobile">
          <div className="grid gap-1">
            {mainNav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setDrawerOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/search"
              onClick={() => setDrawerOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-ink-800 hover:bg-ink-50"
            >
              All Properties
            </Link>
            <Link
              to="/dashboard/properties/new"
              onClick={() => setDrawerOpen(false)}
              className="mt-1 block"
            >
              <Button fullWidth>
                <PlusCircle className="h-4 w-4" />
                List Property
              </Button>
            </Link>
            {!user && (
              <div className="mt-1 grid grid-cols-2 gap-2 pt-2">
                <Link to="/login" onClick={() => setDrawerOpen(false)}>
                  <Button variant="outline" fullWidth>
                    Login
                  </Button>
                </Link>
                <Link to="/register" onClick={() => setDrawerOpen(false)}>
                  <Button variant="secondary" fullWidth>
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
}