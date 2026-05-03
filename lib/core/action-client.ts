import { auth } from "@/lib/auth";
import { z } from "zod";
import { AppError } from "./app-error";
import { Session } from "next-auth";

export type ActionState<T> = {
    success: boolean;
    data?: T;
    error?: string;
};

/**
 * Creates a safe server action with Zod validation and Error handling.
 * Automatically injects the user session if required.
 */
export const createSafeAction = <TInput, TOutput>(
    schema: z.Schema<TInput>,
    handler: (data: TInput, session: Session | null) => Promise<TOutput>
) => {
    return async (data: TInput): Promise<ActionState<TOutput>> => {
        const isProduction = process.env.NODE_ENV === "production";

        try {
            const session = await auth();

            // Validation
            const parseResult = schema.safeParse(data);
            if (!parseResult.success) {
                return {
                    success: false,
                    error: parseResult.error.errors[0].message,
                };
            }

            // Execution
            const result = await handler(parseResult.data, session);

            return {
                success: true,
                data: result,
            };
        } catch (error) {
            // Error Handling
            if (error instanceof AppError) {
                return {
                    success: false,
                    error: error.message,
                };
            }

            if (error instanceof Error) {
                if (!isProduction) {
                    console.error("Action Error:", error);
                }

                return {
                    success: false,
                    error: isProduction ? "Operation failed" : error.message,
                };
            }

            return {
                success: false,
                error: "An unexpected error occurred",
            };
        }
    };
};

/**
 * Creates a safe PROTECTED server action.
 * Throws error if no session exists or user is inactive.
 */
export const createProtectedAction = <TInput, TOutput>(
    schema: z.Schema<TInput>,
    handler: (data: TInput, session: Session) => Promise<TOutput>
) => {
    return createSafeAction(schema, async (data, session) => {
        if (!session?.user) {
            throw new AppError("Unauthorized", 401);
        }

        if (!session.user.isActive) {
            throw new AppError("Account is inactive", 403);
        }

        return handler(data, session);
    });
};

/**
 * Creates a safe PUBLIC server action (no auth required).
 */
export const createPublicAction = <TInput, TOutput>(
    schema: z.Schema<TInput>,
    handler: (data: TInput) => Promise<TOutput>
) => {
    return createSafeAction(schema, async (data, _) => {
        return handler(data);
    });
};
