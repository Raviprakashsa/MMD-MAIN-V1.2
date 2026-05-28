/* global module */
module.exports = {
  async up(db) {
    // Ensure unique index on users.email for quick lookups and uniqueness
    await db.collection('users').createIndex({ email: 1 }, { unique: true, background: true })
  },

  async down(db) {
    await db.collection('users').dropIndex('email_1')
  },
}
