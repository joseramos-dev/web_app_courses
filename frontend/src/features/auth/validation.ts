// Debe coincidir con MIN_PASSWORD_LENGTH en
// backend/modules/auth/password_reset_service.py -- no hay forma de
// compartir esta constante entre Python y TypeScript en este proyecto.
export const MIN_PASSWORD_LENGTH = 8;

export function validateRegisterForm(fields: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
}): string | null {
    if (fields.password !== fields.confirmPassword) return "auth.errors.passwordMismatch";
    if (fields.name.length < 3) return "auth.errors.nameTooShort";
    if (!fields.email.includes("@")) return "auth.errors.invalidEmail";
    if (fields.password.length < MIN_PASSWORD_LENGTH) return "auth.errors.passwordTooShort";
    return null;
}

export function validateForgotPasswordForm(fields: { email: string }): string | null {
    if (!fields.email.includes("@")) return "auth.errors.invalidEmail";
    return null;
}

export function validateResetPasswordForm(fields: {
    password: string;
    confirmPassword: string;
}): string | null {
    if (fields.password !== fields.confirmPassword) return "auth.errors.passwordMismatch";
    if (fields.password.length < MIN_PASSWORD_LENGTH) return "auth.errors.passwordTooShort";
    return null;
}
