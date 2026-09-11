import { Link } from "react-router-dom";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="container-app flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-ink-400">
        <SearchX className="h-8 w-8" />
      </div>
      <h1 className="mt-5 text-3xl font-bold text-ink-900">Page not found</h1>
      <p className="mt-2 max-w-md text-sm text-ink-500">
        The page you're looking for doesn't exist or may have moved.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link to="/">
          <Button>Go home</Button>
        </Link>
        <Link to="/search">
          <Button variant="outline">Search properties</Button>
        </Link>
      </div>
    </div>
  );
}