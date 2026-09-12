import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { RootLayout } from "@/components/layout/RootLayout";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { RequireOwner } from "@/components/auth/RequireOwner";
import { RequireAdmin } from "@/components/auth/RequireAdmin";
import { PageLoader } from "@/components/PageLoader";

const HomePage = lazy(() => import("@/pages/HomePage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const PropertyDetailsPage = lazy(() => import("@/pages/PropertyDetailsPage"));
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const RegisterPage = lazy(() => import("@/pages/auth/RegisterPage"));
const ForgotPasswordPage = lazy(() => import("@/pages/auth/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/pages/auth/ResetPasswordPage"));
const FavoritesPage = lazy(() => import("@/pages/FavoritesPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const NotificationsPage = lazy(() => import("@/pages/NotificationsPage"));
const MyVisitsPage = lazy(() => import("@/pages/MyVisitsPage"));
const InboxPage = lazy(() => import("@/pages/inbox/InboxPage"));
const ChatThreadPage = lazy(() => import("@/pages/inbox/ChatThreadPage"));
const OwnerDashboardPage = lazy(() => import("@/pages/dashboard/OwnerDashboardPage"));
const ProfilePage = lazy(() => import("@/pages/dashboard/ProfilePage"));
const MyPropertiesPage = lazy(() => import("@/pages/dashboard/MyPropertiesPage"));
const AddPropertyPage = lazy(() => import("@/pages/dashboard/AddPropertyPage"));
const EditPropertyPage = lazy(() => import("@/pages/dashboard/EditPropertyPage"));
const OwnerVisitsPage = lazy(() => import("@/pages/dashboard/OwnerVisitsPage"));
const AdminDashboardPage = lazy(() => import("@/pages/admin/AdminDashboardPage"));
const HelpPage = lazy(() => import("@/pages/HelpPage"));

export default function App() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route element={<RootLayout />}>
            <Route index element={<HomePage />} />
            <Route path="search" element={<SearchPage />} />
            <Route path="property/:id" element={<PropertyDetailsPage />} />
            <Route path="help" element={<HelpPage />} />

            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
            <Route path="forgot-password" element={<ForgotPasswordPage />} />
            <Route path="reset-password" element={<ResetPasswordPage />} />

            <Route element={<RequireAuth />}>
              <Route path="favorites" element={<FavoritesPage />} />
              <Route path="my-visits" element={<MyVisitsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="inbox/:conversationId" element={<ChatThreadPage />} />

              <Route element={<RequireOwner />}>
                <Route path="dashboard" element={<OwnerDashboardPage />} />
                <Route path="dashboard/profile" element={<ProfilePage />} />
                <Route path="dashboard/properties" element={<MyPropertiesPage />} />
                <Route path="dashboard/properties/new" element={<AddPropertyPage />} />
                <Route path="dashboard/properties/:id/edit" element={<EditPropertyPage />} />
                <Route path="dashboard/visits" element={<OwnerVisitsPage />} />
              </Route>

              <Route element={<RequireAdmin />}>
                <Route path="admin" element={<AdminDashboardPage />} />
              </Route>
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}