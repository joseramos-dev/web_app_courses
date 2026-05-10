import { Link } from "react-router-dom";
import { useAuth } from "../povider/AuthContext";
import { useAuthModal } from "../context/AuthModalContext";
import type { ReactNode } from "react";

function LoadingScreen() {
  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center text-sm text-gray-600">
      Cargando…
    </div>
  );
}

function Forbidden({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h1 className="text-lg font-semibold text-gray-900">Acceso no permitido</h1>
        <p className="mt-2 text-sm text-gray-700">{message}</p>
        <Link
          to="/courses"
          className="mt-6 inline-flex items-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Volver a cursos
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
  const { openLogin, openRegister } = useAuthModal();

  return (
    <div className="mx-auto max-w-lg px-4 py-16">
      <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        <p className="mt-3 text-sm text-gray-600">
          {dashboardVariant ? (
            <>
              Para ver tu dashboard necesitas una cuenta.{" "}
              <strong>Regístrate</strong> o <strong>inicia sesión</strong> para
              acceder a tu progreso y estadísticas.
            </>
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
            Iniciar sesión
          </button>
          <button
            type="button"
            onClick={openRegister}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
          >
            Registrarse
          </button>
        </div>
        <Link
          to="/courses"
          className="mt-4 inline-block text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Volver a cursos
        </Link>
      </div>
    </div>
  );
}

/** Solo usuarios registrados (cualquier rol). */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) {
    return (
      <GuestAuthGate
        title="Inicia sesión"
        description="Necesitas iniciar sesión o registrarte para acceder a esta página."
      />
    );
  }
  return <>{children}</>;
}

/** Solo administradores. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) {
    return (
      <GuestAuthGate
        title="Inicia sesión"
        description="El panel de administración solo está disponible para administradores. Inicia sesión con una cuenta de administrador."
      />
    );
  }
  if (user.role !== "admin") {
    return (
      <Forbidden message="Esta sección solo está disponible para administradores." />
    );
  }
  return <>{children}</>;
}

/** Instructores y administradores (p. ej. crear/editar cursos y lecciones). */
export function RequireStaff({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) {
    return (
      <GuestAuthGate
        title="Inicia sesión"
        description="Solo instructores y administradores pueden crear o editar cursos y lecciones. Inicia sesión con una cuenta autorizada."
      />
    );
  }
  if (user.role !== "admin" && user.role !== "instructor") {
    return (
      <Forbidden message="Solo instructores y administradores pueden acceder al editor de cursos." />
    );
  }
  return <>{children}</>;
}
