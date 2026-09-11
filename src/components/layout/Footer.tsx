import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { config } from "@/config/config";
import { cityNames } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-white pb-20 lg:pb-0">
      <div className="container-app py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-ink-500">{config.appTagline} Search homes for rent and sale across Pakistan.</p>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Explore</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link className="transition-colors hover:text-brand-600" to="/search?listing_type=rent">For Rent</Link></li>
              <li><Link className="transition-colors hover:text-brand-600" to="/search?listing_type=sale">For Sale</Link></li>
              <li><Link className="transition-colors hover:text-brand-600" to="/dashboard/properties/new">List Your Property</Link></li>
              <li><Link className="transition-colors hover:text-brand-600" to="/search">All Properties</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900">Popular Cities</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              {cityNames.slice(0, 6).map((c) => (
                <li key={c}>
                  <Link className="transition-colors hover:text-brand-600" to={`/search?city=${encodeURIComponent(c)}`}>
                    Properties in {c}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink-900">RentHub</h3>
            <ul className="mt-3 space-y-2 text-sm text-ink-600">
              <li><Link className="transition-colors hover:text-brand-600" to="/register">Create an account</Link></li>
              <li><Link className="transition-colors hover:text-brand-600" to="/login">Sign in</Link></li>
              <li><Link className="transition-colors hover:text-brand-600" to="/help">Help Center</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-ink-100 pt-6 text-xs text-ink-400">
          <p>© {new Date().getFullYear()} RentHub. Find a place you&apos;ll love.</p>
          <p className="mt-1">Property listings are user-submitted. Always verify before paying. Report suspicious listings.</p>
        </div>
      </div>
    </footer>
  );
}