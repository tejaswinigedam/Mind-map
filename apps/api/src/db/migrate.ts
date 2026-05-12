import 'dotenv/config'
import { Pool } from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })

  const migrationFiles = [
    '001_initial.sql',
  ]

  for (const file of migrationFiles) {
    const sql = readFileSync(join(__dirname, 'migrations', file), 'utf-8')
    console.log(`Running migration: ${file}`)
    await pool.query(sql)
    console.log(`✓ ${file}`)
  }

  await pool.end()
  console.log('All migrations complete.')
}

migrate().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
