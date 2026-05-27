module.exports = {
  async up(db, client) {
    // Ensure unique index on users.email for quick lookups and uniqueness
    await db.collection('users').createIndex({ email: 1 }, { unique: true, background: true })
  },

  async down(db, client) {
    await db.collection('users').dropIndex('email_1')
  },
}
