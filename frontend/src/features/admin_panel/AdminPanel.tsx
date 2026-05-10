
import type { IUser } from "../../shared/interfaces/IUser"
import type { UserRoles } from "../../shared/types/UserRoles"
import { API_deleteUser, API_getUsers, API_updateUserRole } from "./api"
import { useState, useEffect } from "react"
import toast from "react-hot-toast"

const userRoles: UserRoles[] = ["student", "instructor", "admin"]

export const AdminPanel = () => {

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
        const detail = await API_deleteUser(user.id!)
        setUsers((currentUsers) => currentUsers.filter((_, currentIndex) => currentIndex !== index))
        toast.success(detail)
    }

    const onRoleChange = async (user: IUser, role: UserRoles) => {
        const updatedUser = await API_updateUserRole(user.id!, role)
        toast.success(`role from user ${user.name} updated from ${user.role} to ${updatedUser.role}`)
        setUsers((currentUsers) =>
            currentUsers.map((currentUser) =>
                currentUser === user ? { ...currentUser, role } : currentUser
            )
        )
    }

    if (loading) {
        return (
            <p className="min-h-screen bg-neutral-100 p-8 text-sm text-gray-600 dark:bg-surface dark:text-slate-400">
                loading ...
            </p>
        )
    }
    return (
        <div className="min-h-screen bg-neutral-100 p-8 dark:bg-surface">
            <div className="mx-auto flex max-w-5xl flex-col gap-4">
                <header>
                    <h1 className="text-3xl font-semibold text-gray-900 dark:text-slate-100">Users</h1>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{users.length} registered users</p>
                </header>

                {
                    users.map((user, index) => (
                        <UserCard
                            key={user.id ?? index}
                            user={user}
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
    { user, onDelete, onRoleChange }
        : {
            user: IUser,
            onDelete: () => void,
            onRoleChange: (role: UserRoles) => void
        }
) => {
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false)
    const createdAt = formatUserCreationDate(user.time_creation)

    return (
        <>
            <article className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-slate-600 dark:bg-slate-800">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="truncate text-xl font-semibold text-gray-900 dark:text-slate-100">{user.name}</h2>
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium uppercase tracking-wide text-gray-600 dark:bg-slate-700 dark:text-slate-300">
                                {user.role}
                            </span>
                        </div>

                        <dl className="mt-4 grid gap-3 text-sm text-gray-600 dark:text-slate-300 sm:grid-cols-2">
                            <UserInfo label="ID" value={user.id ?? "No ID"} />
                            <UserInfo label="Email" value={user.email} />
                            <UserInfo label="Role" value={user.role} />
                            <UserInfo label="Created" value={createdAt} />
                        </dl>
                    </div>

                    <div className="flex shrink-0 flex-col gap-3 sm:flex-row md:flex-col">
                        <label className="flex flex-col gap-1 text-sm font-medium text-gray-700 dark:text-slate-300">
                            Role
                            <select
                                value={user.role}
                                onChange={(event) => onRoleChange(event.target.value as UserRoles)}
                                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-gray-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500"
                            >
                                {userRoles.map((role) => (
                                    <option key={role} value={role}>
                                        {role}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <button
                            type="button"
                            onClick={() => setIsConfirmModalOpen(true)}
                            className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                        >
                            Delete user
                        </button>
                    </div>
                </div>
            </article>

            {isConfirmModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-slate-800">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-slate-100">Delete user?</h2>
                        <p className="mt-2 text-sm text-gray-600 dark:text-slate-300">
                            Are you sure you want to delete {user.name}?
                        </p>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={() => setIsConfirmModalOpen(false)}
                                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsConfirmModalOpen(false)
                                    onDelete()
                                }}
                                className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
                            >
                                Yes, delete
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

const formatUserCreationDate = (date: Date | string | null): string => {
    if (!date) return "Unknown"

    const parsedDate = new Date(date)
    if (Number.isNaN(parsedDate.getTime())) return "Unknown"

    return parsedDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}
