"use server"

import { revalidatePath } from "next/cache"
import { createProtectedAction } from "@/lib/core/action-client"
import { UserService } from "@/lib/services/user.service"
import { CreateUserSchema, LoginSchema, UserRoleSchema } from "@/lib/validators/common"
import { signIn } from "@/lib/auth"
import { AuthError } from "next-auth"
import { z } from "zod"

/**
 * Module 1: Authentication Actions
 * Requirement: MMD-AUTH-001 - User login with role-based access
 */

export async function loginAction(credentials: z.infer<typeof LoginSchema>) {
  try {
    const validated = LoginSchema.parse(credentials)

    await signIn("credentials", {
      email: validated.email.toLowerCase(),
      password: validated.password,
      redirect: false,
    })

    // If we reach here, signIn succeeded
    return { success: true, data: null }
  } catch (error) {
    console.error('Login action error:', error)

    if (error instanceof AuthError) {
      switch (error.type) {
        case 'CredentialsSignin':
          return { success: false, error: "Invalid email or password" }
        default:
          return { success: false, error: "Authentication failed" }
      }
    }
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message }
    }

    // Check if error has a message property
    const errorMessage = error instanceof Error ? error.message : "Login failed"
    return { success: false, error: errorMessage }
  }
}

export async function logoutAction() {
  await import("@/lib/auth").then(m => m.signOut({ redirect: false }))
}

export const createUserAction = createProtectedAction(
  CreateUserSchema,
  async (payload, session) => {
    const user = await UserService.create(
      { id: session.user.id, role: session.user.role },
      payload
    )
    revalidatePath('/dashboard/users')
    revalidatePath('/dashboard/settings')
    return user
  }
)

// Alias for strict naming if used elsewhere
export const createUser = createUserAction

const UpdateUserRoleSchema = z.object({
  userId: z.string().min(1),
  role: UserRoleSchema.optional(),
  isActive: z.boolean().optional(),
})

export const updateUserRoleAction = createProtectedAction(
  UpdateUserRoleSchema,
  async (payload, session) => {
    const user = await UserService.updateRole(
      { id: session.user.id, role: session.user.role },
      payload
    )
    revalidatePath('/dashboard/users')
    revalidatePath('/dashboard/settings')
    return user
  }
)

export const updateUserRole = updateUserRoleAction

// Simple Server Action for getting session user (already protected by logic inside)
export async function authenticateUser() {
  // This is often used by client components to check session efficiently
  // We can leave it, or use auth() directly in server components
  const { auth } = await import("@/lib/auth")
  const session = await auth()
  if (!session?.user) return { success: false, error: "Unauthorized" }
  return { success: true, data: session.user }
}

const GetUsersFilterSchema = z.object({
  role: z.string().optional(),
  isActive: z.boolean().optional()
})

export const getUsers = createProtectedAction(
  GetUsersFilterSchema,
  async (filters, session) => {
    const users = await UserService.getAll(
      { id: session.user.id, role: session.user.role },
      filters
    )
    return users
  }
)

const GetByIdSchema = z.object({ id: z.string() })

export const getUserById = createProtectedAction(
  GetByIdSchema,
  async (payload, session) => {
    const user = await UserService.getById(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    return user
  }
)

const DeleteUserSchema = z.object({ id: z.string() })

export const deleteUser = createProtectedAction(
  DeleteUserSchema,
  async (payload, session) => {
    await UserService.delete(
      { id: session.user.id, role: session.user.role },
      payload.id
    )
    revalidatePath('/dashboard/users')
    revalidatePath('/dashboard/settings')
    return { success: true }
  }
)

const ResetPasswordSchema = z.object({
  userId: z.string().min(1),
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    "Password must contain uppercase, lowercase and number")
    .regex(/[!@#$%^&*(),.?":{}|<>_-]/, "Password must contain a special character"),
})

export const resetPassword = createProtectedAction(
  ResetPasswordSchema,
  async (payload, session) => {
    await UserService.resetPassword(
      { id: session.user.id, role: session.user.role },
      payload
    )
    revalidatePath('/dashboard/settings')
    return { success: true }
  }
)
