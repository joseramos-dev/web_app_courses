import { Link } from "react-router-dom";
import { Trans, useTranslation } from "react-i18next";
import { useAuth } from "../povider/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import type { ReactNode } from "react";

function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-gray-600">
      {t("auth.loading")}
    </div>
  );
}

function Forbidden({ message }: { message: string }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900">{t("auth.forbiddenTitle")}</h1>
        <p className="mt-2 text-sm text-gray-700">{message}</p>
        <Link
          to="/courses"
          className="mt-6 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          {t("auth.backToCourses")}
        </Link>
      </div>
    </div>
  );
}

export function GuestAuthGate({
  title,
  description,
  dashboardVariant = false,
}: {
  title: string;
  description: string;
  dashboardVariant?: boolean;
}) {
  const { t } = useTranslation();
  const { openLogin, openRegister } = useAuthModal();

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-3 text-sm text-gray-600">
          {dashboardVariant ? (
            <Trans
              i18nKey="auth.guest.dashboardNeedAccount"
              components={{ 1: <strong />, 3: <strong /> }}
            />
          ) : (
            description
          )}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={openLogin}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50"
          >
            {t("nav.login")}
          </button>
          <button
            type="button"
            onClick={openRegister}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            {t("nav.register")}
          </button>
        </div>
        <Link
          to="/courses"
          className="mt-4 inline-block text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          {t("auth.backToCourses")}
        </Link>
      </div>
    </div>
  );
}

/** Solo usuarios registrados (cualquier rol). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) {
    return (
      <GuestAuthGate
        title={t("auth.guest.loginTitle")}
        description={t("auth.guest.needLoginDescription")}
      />
    );
  }
  return <>{children}</>;
}

/** Solo administradores. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) {
    return (
      <GuestAuthGate
        title={t("auth.guest.loginTitle")}
        description={t("auth.guest.adminOnlyDescription")}
      />
    );
  }
  if (user.role !== "admin") {
    return <Forbidden message={t("auth.guest.forbiddenAdmin")} />;
  }
  return <>{children}</>;
}

/** Instructores y administradores (p. ej. crear/editar cursos y lecciones). */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) {
    return (
      <GuestAuthGate
        title={t("auth.guest.loginTitle")}
        description={t("auth.guest.staffOnlyDescription")}
      />
    );
  }
  if (user.role !== "admin" && user.role !== "instructor") {
    return <Forbidden message={t("auth.guest.forbiddenStaff")} />;
  }
  return <>{children}</>;
}
