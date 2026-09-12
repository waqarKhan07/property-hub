import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PropertyWizard } from "@/pages/dashboard/PropertyWizard";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export default function EditPropertyPage() {
  useDocumentTitle("Edit listing — RentHub");
  const { id } = useParams<{ id: string }>();
  return (
    <div className="container-app py-8">
      <div className="mx-auto mb-5 flex w-full max-w-3xl items-center gap-3">
        <Link to="/dashboard/properties" className="rounded-lg p-1.5 text-ink-600 hover:bg-ink-100" aria-label="Back to my properties">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-ink-900">Edit listing</h1>
          <p className="text-sm text-ink-500">Changes save as you go.</p>
        </div>
      </div>
      <PropertyWizard key={id} propertyId={id} onCancel={() => window.history.back()} />
    </div>
  );
}