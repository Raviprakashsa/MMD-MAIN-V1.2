import connectDB from '../../lib/db/mongodb'
import User from '../../lib/db/models/User'

async function run() {
  await connectDB()
  const users = await User.find({}, { email: 1, role: 1, isActive: 1 }).lean()
  console.log(JSON.stringify(users, null, 2))
  process.exit(0)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
