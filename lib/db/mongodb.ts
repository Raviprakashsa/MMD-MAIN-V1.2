import mongoose from 'mongoose'

const MONGODB_URI =
  process.env.DATABASE_URL ||
  (process.env.NODE_ENV !== 'production' ? 'mongodb://localhost:27017/mmdss' : '')

interface MongooseCache {
  conn: typeof mongoose | null
  promise: Promise<typeof mongoose> | null
}

const globalWithMongoose = globalThis as typeof globalThis & { mongoose?: MongooseCache }

globalWithMongoose.mongoose ??= { conn: null, promise: null }
const cached = globalWithMongoose.mongoose

async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('Please define the DATABASE_URL environment variable')
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    }

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('MongoDB connected successfully')
      return mongoose
    })
  }

  try {
    cached.conn = await cached.promise
  } catch (e) {
    cached.promise = null
    throw e
  }

  return cached.conn
}

export default connectDB

