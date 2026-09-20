import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const databasePath = process.env.SIEM_DATABASE_PATH ?? join(process.cwd(), 'data', 'siem.db')

let database: DatabaseSync | undefined

export function getDatabase() {
  if (!database) {
    mkdirSync(dirname(databasePath), { recursive: true })
    database = new DatabaseSync(databasePath)
    database.exec('PRAGMA journal_mode = WAL;')
    database.exec('PRAGMA foreign_keys = ON;')
  }
  return database
}

export function closeDatabase() {
  database?.close()
  database = undefined
}

