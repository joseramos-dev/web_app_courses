import { SuperiorNavBar } from "./shared/components/SuperiorNavBar";
import { Auth } from "./features/auth/Auth";
import { Courses } from "./features/courses/Courses";
import { Routes, Route, Navigate, useSearchParams, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import type { AuthType } from "./shared/types/AuthTypes";
import { Toaster } from "react-hot-toast";
import { useAuth } from "./shared/provider/AuthContext";
import { AdminPanel } from "./features/admin_panel/AdminPanel";
import { CourseDetail } from "./features/course_detail/CourseDetail";
import { CourseEdit } from "./features/course_edit/CourseEdit";
import { LessonEdit } from "./features/course_edit/LessonEdit";
import { CourseStudents } from "./features/course_students/CourseStudents";
import { Dashboard } from "./features/dashboard/Dashboard";
import { Lesson } from "./features/lesson/Lesson";
import { Settings } from "./features/settings/Settings";
import { AuthModalProvider } from "./shared/context/AuthModalContext";
import { OnboardingProvider } from "./shared/context/OnboardingContext";
import { OnboardingPreferencesModal } from "./features/onboarding/OnboardingPreferencesModal";
import { useOnboardingGate } from "./features/onboarding/useOnboardingGate";
import { RequireAdmin, RequireAuth, RequireStaff } from "./shared/components/RouteGuards";
import { Footer } from "./shared/components/Footer";
import { LandingPage } from "./features/landing/LandingPage";

export const App = () => {
    const [authType, setAuthType] = useState<AuthType | null>(null);
    const [resetToken, setResetToken] = useState("");
    const [searchParams, setSearchParams] = useSearchParams();
    const location = useLocation();
    const { isAdmin, isLoading } = useAuth();

    const isLessonPlayer = /^\/course\/\d+\/lesson\/\d+\/?$/.test(location.pathname);

    useEffect(() => {
        const token = searchParams.get("reset_token");
        if (!token) return;
        setResetToken(token);
        setAuthType("ResetPassword");
        searchParams.delete("reset_token");
        setSearchParams(searchParams, { replace: true });
    }, [searchParams, setSearchParams]);

    const {
        isOpen: onboardingOpen,
        openOnboarding,
        closeOnboarding,
        userId: onboardingUserId,
    } = useOnboardingGate();

    const onboarding = useMemo(() => ({ openOnboarding }), [openOnboarding]);

    const authModal = useMemo(
        () => ({
            openLogin: () => setAuthType("Login"),
            openRegister: () => setAuthType("Register"),
        }),
        [],
    );

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-uned-primary mx-auto"></div>
                    <p className="text-gray-600 mt-4">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <AuthModalProvider value={authModal}>
            <OnboardingProvider value={onboarding}>
            <div className="flex min-h-screen flex-col bg-surface">
                {!isLessonPlayer ? (
                    <SuperiorNavBar setAuthType={setAuthType} isAdmin={isAdmin()} />
                ) : null}
                {authType ? (
                    <Auth authType={authType} setAuthType={setAuthType} resetToken={resetToken} />
                ) : null}
                <main className="flex w-full flex-1 flex-col">
                    <Routes>
                        <Route path="/" element={<LandingPage />} />
                        <Route path="/courses" element={<Courses />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/profile" element={<Navigate to="/settings" replace />} />
                        <Route
                            path="/settings"
                            element={
                                <RequireAuth>
                                    <Settings />
                                </RequireAuth>
                            }
                        />
                        <Route
                            path="/admin"
                            element={
                                <RequireAdmin>
                                    <AdminPanel />
                                </RequireAdmin>
                            }
                        />
                        <Route
                            path="/course/new"
                            element={
                                <RequireStaff>
                                    <CourseEdit />
                                </RequireStaff>
                            }
                        />
                        <Route path="/course/:courseId" element={<CourseDetail />} />
                        <Route
                            path="/course/:courseId/students"
                            element={
                                <RequireStaff>
                                    <CourseStudents />
                                </RequireStaff>
                            }
                        />
                        <Route
                            path="/course/:courseId/edit"
                            element={
                                <RequireStaff>
                                    <CourseEdit />
                                </RequireStaff>
                            }
                        />
                        <Route
                            path="/course/:courseId/lesson/:lessonId/edit"
                            element={
                                <RequireStaff>
                                    <LessonEdit />
                                </RequireStaff>
                            }
                        />
                        <Route
                            path="/course/:courseId/lesson/:lessonId"
                            element={
                                <RequireAuth>
                                    <Lesson />
                                </RequireAuth>
                            }
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
                {!isLessonPlayer ? <Footer /> : null}
                {onboardingOpen && onboardingUserId != null ? (
                    <OnboardingPreferencesModal
                        userId={onboardingUserId}
                        onClose={closeOnboarding}
                    />
                ) : null}
                <Toaster
                    position="bottom-center"
                    toastOptions={{ style: { marginBottom: 24 } }}
                />
            </div>
            </OnboardingProvider>
        </AuthModalProvider>
    );
};
