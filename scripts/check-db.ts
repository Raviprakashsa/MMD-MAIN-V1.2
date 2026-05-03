#!/usr/bin/env node
/**
 * Database Connection Diagnostic
 * Run this to check if MongoDB is accessible
 */

import mongoose from 'mongoose'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Parse .env file manually
const envPath = join(process.cwd(), '.env')
const envRegex = /^([^=:#]+)=(.*)$/
try {
  const envContent = readFileSync(envPath, 'utf-8')
  envContent.split('\n').forEach(line => {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('#')) return
    
    const match = envRegex.exec(trimmedLine)
    if (match) {
      const key = match[1].trim()
      let value = match[2].trim()
      // Remove surrounding quotes
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  })
} catch (error) {
  console.error('⚠️  Could not read .env file:', error instanceof Error ? error.message : error)
}

const DATABASE_URL = process.env.DATABASE_URL

console.log('🔍 MMDSS Database Diagnostic\n')
console.log('Environment Variables:')
console.log('  DATABASE_URL:', DATABASE_URL || '❌ NOT SET')
console.log('  NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ SET' : '❌ NOT SET')
console.log('  NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'http://localhost:3000')
console.log()

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set in .env file')
  process.exit(1)
}

console.log('📡 Attempting to connect to MongoDB...')
console.log('   URL:', DATABASE_URL)
console.log()

async function checkDatabase() {
  try {
    await mongoose.connect(DATABASE_URL!)
    console.log('✅ MongoDB connection successful!')
    console.log()
    
    // Check for users
    if (!mongoose.connection.db) {
      throw new Error('Database connection not established')
    }
    
    const User = mongoose.connection.db.collection('users')
    const userCount = await User.countDocuments()
    
    console.log('📊 Database Statistics:')
    console.log('  Users:', userCount)
    
    if (userCount === 0) {
      console.log()
      console.log('⚠️  WARNING: No users found in database!')
      console.log('   Run: npm run db:seed')
    } else {
      // List user emails
      const users = await User.find({}).project({ email: 1, role: 1 }).toArray()
      console.log()
      console.log('👥 Available Users:')
      users.forEach(user => {
        console.log(`   - ${user.email} (${user.role})`)
      })
    }
    
    console.log()
    console.log('✅ Diagnostic complete!')
    process.exit(0)
  } catch (error) {
    console.error('❌ MongoDB connection failed!')
    console.error()
    console.error('Error:', error instanceof Error ? error.message : String(error))
    console.error()
    console.log('💡 Troubleshooting:')
    console.log('  1. Check if MongoDB is running:')
    console.log('     Windows: Get-Service MongoDB*')
    console.log('     Or start it: net start MongoDB')
    console.log()
    console.log('  2. Verify DATABASE_URL in .env:')
    console.log('     mongodb://localhost:27017/mmdss')
    console.log()
    console.log('  3. If MongoDB is not installed:')
    console.log('     Download from: https://www.mongodb.com/try/download/community')
    process.exit(1)
  }
}

checkDatabase()
