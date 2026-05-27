/* global process,module */
// migrate-mongo config. Uses DATABASE_URL from environment when available.
const url = process.env.DATABASE_URL || 'mongodb://localhost:27017/mmdss'

module.exports = {
  mongodb: {
    url,
    databaseName: url.split('/').pop() || 'mmdss',
    options: {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
  },
  migrationsDir: 'migrations',
  changelogCollectionName: 'migrations_changelog',
}
