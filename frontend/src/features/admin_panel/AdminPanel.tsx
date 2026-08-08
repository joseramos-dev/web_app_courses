
import type { IUser } from "../../shared/interfaces/IUser"
import type { UserRoles } from "../../shared/types/UserRoles"
import { API_deleteUser, API_getUsers, API_updateUserRole } from "./api"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import { useAuth } from "../../shared/povider/AuthContext"

const userRoles: UserRoles[] = ["student", "instructor", "admin"]

export const AdminPanel = () => {
    const { t } = useTranslation()
    const { user: currentUser } = useAuth()
    const [users, setUsers] = useState<IUser[]>([])
    const [loading, setLoading] = useState(false)

    const fetchUsers = async () => {
        setLoading(true)
        setUsers(await API_getUsers())
        setLoading(false)
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const onDeleteUser = async (user: IUser, index: number) => {
        if (currentUser?.id === user.id) {
            toast.error(t("admin.cannotDeleteSelf"))
            return
        }
        try {
            const detail = await API_deleteUser(user.id!)
            setUsers((currentUsers) => currentUsers.filter((_, currentIndex) => currentIndex !== index))
            toast.success(detail)
        } catch (error) {
            toast.error(typeof error === "string" ? error : t("admin.deleteUserFailed"))
        }
    }

    const onRoleChange = async (user: IUser, role: UserRoles) => {
        if (currentUser?.id === user.id && role !== "admin") {
            toast.error(t("admin.cannotRemoveOwnAdmin"))
            return
        }
        try {
            const updatedUser = await API_updateUserRole(user.id!, role)
            toast.success(t("admin.roleUpdateSuccess", {
                name: user.name,
                from: t(`admin.roles.${user.role}`),
                to: t(`admin.roles.${updatedUser.role}`),
            }))
            setUsers((currentUsers) =>
                currentUsers.map((currentUser) =>
                    currentUser === user ? { ...currentUser, role } : currentUser
                )
            )
        } catch {
            toast.error(t("admin.roleUpdateFailed"))
        }
    }

    if (loading) {
        return (
            <p className="min-h-screen bg-neutral-100 p-8 text-sm text-gray-600 dark:bg-surface dark:text-slate-400">
                {t("admin.loading")}
            </p>
        )
    }
    return (
        <div className="min-h-screen bg-neutral-100 p-8 dark:bg-surface">
            <div className="mx-auto flex max-w-5xl flex-col gap-4">
                <header>
                    <h1 className="text-3xl font-semibold text-gray-900 dark:text-slate-100">{t("admin.title")}</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">
                        {t("admin.registeredUsers", { count: users.length })}
                    </p>
                </header>

                {
                    users.map((user, index) => (
                        <UserCard
                            key={user.id ?? index}
                            user={user}
                            canDelete={currentUser?.id !== user.id}
                            onDelete={() => {
                                onDeleteUser(user, index)
                            }}
                            onRoleChange={(role) => {
                                onRoleChange(user,role)
                            }}
                        />
                    ))
                }
            </div>
        </div>
    )
}

const UserCard = (
    { user, canDelete, onDelete, onRoleChange }
        : {
            user: IUser,
            canDelete: boolean,
            onDelete: () => void,
            onRoleChange: (role: UserRoles) => void
        }
) => {
    const { t, i18n } = useTranslation()
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const createdAt = formatUserCreationDate(user.time_creation, i18n.language, t)

    return (
        <>
            <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-slate-800">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="truncate text-xl font-semibold text-gray-900 dark:text-slate-100">{user.name}</h2>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                                {t(`admin.roles.${user.role}`)}
                            </span>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-slate-300 sm:grid-cols-2">
                            <UserInfo label={t("admin.fields.id")} value={user.id ?? t("admin.noId")} />
                            <UserInfo label={t("admin.fields.email")} value={user.email} />
                            <UserInfo label={t("admin.fields.role")} value={t(`admin.roles.${user.role}`)} />
                            <UserInfo label={t("admin.fields.created")} value={createdAt} />
                        </dl>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
                        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-slate-300">
                            {t("admin.fields.role")}
                            <select
                                value={user.role}
                                onChange={(event) => onRoleChange(event.target.value as UserRoles)}
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500"
                            >
                                {userRoles.map((role) => (
                                    <option key={role} value={role}>
                                        {t(`admin.roles.${role}`)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        {canDelete && (
                            <button
                                type="button"
                                onClick={() => setIsConfirmModalOpen(true)}
                                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                            >
                                {t("admin.deleteUser")}
                            </button>
                        )}
                    </div>
                </div>
            </article>

            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">{t("admin.deleteConfirmTitle")}</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                            {t("admin.deleteConfirmMessage", { name: user.name })}
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                {t("common.cancel")}
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsConfirmModalOpen(false)
                                    onDelete()
                                }}
                                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                                {t("admin.yesDelete")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

const UserInfo = ({ label, value }: { label: string, value: string | number }) => (
    <div>
        <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-slate-500">{label}</dt>
        <dd className="mt-1 break-words text-gray-700 dark:text-slate-300">{value}</dd>
    </div>
)

const formatUserCreationDate = (
    date: Date | string | null,
    locale: string,
    t: (key: string) => string,
): string => {
    if (!date) return t("admin.unknownDate")

    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) return t("admin.unknownDate")

    return parsedDate.toLocaleDateString(locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}
