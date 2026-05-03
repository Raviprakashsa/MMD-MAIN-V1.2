// This project uses Mongoose instead of Prisma
// This file is kept for backwards compatibility with imports

// Re-export the MongoDB connection
export { default as connectDB } from '@/lib/db/mongodb'

// Export a dummy prisma object for any legacy code
export const prisma = {
  // Add stub methods if needed for backward compatibility
  $connect: async () => {
    const connectDB = (await import('@/lib/db/mongodb')).default
    await connectDB()
  },
  $disconnect: async () => {
    // Mongoose handles connection pooling automatically
  },
}
