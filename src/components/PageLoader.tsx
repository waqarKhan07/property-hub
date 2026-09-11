export function PageLoader() {
  return (
    <div className="container-app flex min-h-[40vh] items-center justify-center py-16">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-ink-200 border-t-brand-600" role="status" aria-label="Loading" />
    </div>
  );
}