
import connectDB from "@/lib/db/mongodb"
import User, { UserRole } from "@/lib/db/models/User"
import AuditLog from "@/lib/db/models/AuditLog"
import { hash } from "bcryptjs"
import { AppError, ForbiddenError, NotFoundError, ConflictError } from "@/lib/core/app-error"
import { serializeDoc, serializeDocs } from "@/lib/utils/serialize"


// Schemas (Reusing/Adapting from common validators or defining here if specific context needed)
// We will rely on the Action layer to pass validated data, but we can define inputs here for type safety

export interface CreateUserInput {
    email: string
    password: string
    name: string
    role: UserRole
}

export interface UpdateUserRoleInput {
    userId: string
    role?: UserRole
    isActive?: boolean
}

export interface ResetPasswordInput {
    userId: string
    newPassword: string
}

interface UserContext {
    id: string
    role: string
}

function ensureSuperAdmin(user: UserContext) {
    if (user.role !== 'SUPER_ADMIN') {
        throw new ForbiddenError("Only super admins can manage users")
    }
}

async function activeSuperAdminCount() {
    return User.countDocuments({ role: 'SUPER_ADMIN', isActive: true, deletedAt: null })
}

export class UserService {
    /**
     * Create a new user
     */
    static async create(adminUser: UserContext, data: CreateUserInput) {
        ensureSuperAdmin(adminUser)

        await connectDB()

        const normalizedEmail = data.email.toLowerCase()
        const existingUser = await User.findOne({ email: normalizedEmail })

        if (existingUser) {
            throw new ConflictError("User already exists")
        }

        const hashedPassword = await hash(data.password, 12)

        const user = await User.create({
            email: normalizedEmail,
            password: hashedPassword,
            name: data.name,
            role: data.role,
            isActive: true,
        })

        await AuditLog.create({
            userId: adminUser.id,
            action: "USER_CREATED",
            entity: "User",
            entityId: user._id.toString(),
            newValue: {
                email: user.email,
                name: user.name,
                role: user.role,
            },
        })

        return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
        }
    }

    /**
     * Get all users
     */
    static async getAll(adminUser: UserContext, filters?: { role?: string; isActive?: boolean }) {
        ensureSuperAdmin(adminUser)

        await connectDB()

        const query: Record<string, unknown> = { deletedAt: null }
        if (filters?.role) query.role = filters.role
        if (filters?.isActive !== undefined) query.isActive = filters.isActive

        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .lean()

        return serializeDocs(users)
    }

    /**
     * Get user by ID
     */
    static async getById(adminUser: UserContext, userId: string) {
        if (adminUser.role !== 'SUPER_ADMIN' && adminUser.id !== userId) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const user = await User.findOne({ _id: userId, deletedAt: null }).select('-password').lean()
        if (!user) throw new NotFoundError("User not found")

        return serializeDoc(user)
    }

    /**
     * Update User Role or Status
     */
    static async updateRole(adminUser: UserContext, data: UpdateUserRoleInput) {
        ensureSuperAdmin(adminUser)

        await connectDB()

        const target = await User.findById(data.userId)
        if (!target) throw new NotFoundError("User not found")

        const updates: Partial<{ role: UserRole; isActive: boolean; deletedAt: Date | null }> = {}
        if (data.role !== undefined && data.role !== target.role) updates.role = data.role
        if (data.isActive !== undefined && data.isActive !== target.isActive) {
            updates.isActive = data.isActive
            updates.deletedAt = data.isActive ? null : new Date()
        }

        if (Object.keys(updates).length === 0) return serializeDoc(target.toObject())

        const isSelf = adminUser.id === target._id.toString()
        const nextRole = updates.role ?? target.role
        const nextActive = updates.isActive ?? target.isActive

        if (target.role === 'SUPER_ADMIN' && (nextRole !== 'SUPER_ADMIN' || !nextActive)) {
            const superAdminCount = await activeSuperAdminCount()
            if (superAdminCount <= 1) {
                throw new AppError(isSelf
                    ? "Cannot remove your own super admin access as the last active super admin"
                    : "Cannot disable or demote the last active super admin")
            }
        }

        const oldValue = { role: target.role, isActive: target.isActive }

        Object.assign(target, updates)
        await target.save()

        await AuditLog.create({
            userId: adminUser.id,
            action: "USER_ROLE_UPDATED",
            entity: "User",
            entityId: target._id.toString(),
            oldValue,
            newValue: { role: target.role, isActive: target.isActive },
        })

        return serializeDoc(target.toObject())
    }

    /**
     * Delete User (Soft Delete)
     */
    static async delete(adminUser: UserContext, userId: string) {
        ensureSuperAdmin(adminUser)

        await connectDB()

        const user = await User.findById(userId)
        if (!user || user.deletedAt) throw new NotFoundError("User not found")

        // Prevent deleting self
        if (adminUser.id === userId) {
            throw new AppError("Cannot delete yourself")
        }

        if (user.role === 'SUPER_ADMIN') {
            const superAdminCount = await activeSuperAdminCount()
            if (superAdminCount <= 1) {
                throw new AppError("Cannot delete the last active super admin")
            }
        }

        user.deletedAt = new Date()
        user.isActive = false
        await user.save()

        await AuditLog.create({
            userId: adminUser.id,
            action: "USER_DELETED",
            entity: "User",
            entityId: userId,
            oldValue: { isActive: true, deletedAt: null },
            newValue: { isActive: false, deletedAt: user.deletedAt },
        })

        return { success: true }
    }

    /**
     * Reset Password
     */
    static async resetPassword(requestor: UserContext, data: ResetPasswordInput) {
        if (requestor.role !== 'SUPER_ADMIN' && requestor.id !== data.userId) {
            throw new ForbiddenError("Forbidden")
        }

        await connectDB()

        const user = await User.findById(data.userId)
        if (!user || user.deletedAt) throw new NotFoundError("User not found")

        user.password = await hash(data.newPassword, 12)
        await user.save()

        await AuditLog.create({
            userId: requestor.id,
            action: "PASSWORD_RESET",
            entity: "User",
            entityId: data.userId,
            newValue: { resetBy: requestor.id === data.userId ? "self" : "admin" },
        })

        return { success: true }
    }
}
