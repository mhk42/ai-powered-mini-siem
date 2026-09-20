import { alerts as seedAlerts, events as seedEvents, type Alert, type AlertStatus, type Event, type Severity } from '@/lib/siem-data'
import { getDatabase } from './client'

export type WorkspaceState = { alerts: Alert[]; events: Event[]; uploads: { id: number; filename: string; createdAt: string; eventCount: number }[] }

function ensureSchema() {
  const database = getDatabase()
  database.exec(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      event_type TEXT NOT NULL,
      source TEXT NOT NULL,
      hostname TEXT NOT NULL,
      username TEXT NOT NULL,
      source_ip TEXT,
      severity TEXT NOT NULL,
      message TEXT NOT NULL,
      raw_log TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      rule TEXT NOT NULL,
      hostname TEXT NOT NULL,
      username TEXT NOT NULL,
      source_ip TEXT,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL,
      event_count INTEGER NOT NULL,
      event_ids TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      event_count INTEGER NOT NULL
    );
  `)

  const eventCount = Number(database.prepare('SELECT COUNT(*) AS count FROM events').get()?.count ?? 0)
  if (eventCount === 0) {
    const insert = database.prepare('INSERT INTO events (id, timestamp, event_type, source, hostname, username, source_ip, severity, message, raw_log) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    for (const event of seedEvents) insert.run(event.id, event.timestamp, event.eventType, event.source, event.hostname, event.username, event.sourceIp ?? null, event.severity, event.message, event.rawLog)
  }

  const alertCount = Number(database.prepare('SELECT COUNT(*) AS count FROM alerts').get()?.count ?? 0)
  if (alertCount === 0) {
    const insert = database.prepare('INSERT INTO alerts (id, title, description, severity, status, rule, hostname, username, source_ip, first_seen, last_seen, event_count, event_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    for (const alert of seedAlerts) insert.run(alert.id, alert.title, alert.description, alert.severity, alert.status, alert.rule, alert.hostname, alert.username, alert.sourceIp ?? null, alert.firstSeen, alert.lastSeen, alert.eventCount, JSON.stringify(alert.eventIds))
  }
}

function rowToEvent(row: Record<string, unknown>): Event {
  return { id: String(row.id), timestamp: String(row.timestamp), eventType: String(row.event_type), source: String(row.source), hostname: String(row.hostname), username: String(row.username), sourceIp: row.source_ip ? String(row.source_ip) : undefined, severity: String(row.severity) as Severity, message: String(row.message), rawLog: String(row.raw_log) }
}

function rowToAlert(row: Record<string, unknown>): Alert {
  return { id: String(row.id), title: String(row.title), description: String(row.description), severity: String(row.severity) as Severity, status: String(row.status) as AlertStatus, rule: String(row.rule), hostname: String(row.hostname), username: String(row.username), sourceIp: row.source_ip ? String(row.source_ip) : undefined, firstSeen: String(row.first_seen), lastSeen: String(row.last_seen), eventCount: Number(row.event_count), eventIds: JSON.parse(String(row.event_ids)) as string[] }
}

export function getWorkspaceState(): WorkspaceState {
  ensureSchema()
  const database = getDatabase()
  return {
    alerts: (database.prepare('SELECT * FROM alerts ORDER BY last_seen DESC').all() as Record<string, unknown>[]).map(rowToAlert),
    events: (database.prepare('SELECT * FROM events ORDER BY timestamp DESC').all() as Record<string, unknown>[]).map(rowToEvent),
    uploads: (database.prepare('SELECT id, filename, created_at, event_count FROM uploads ORDER BY created_at DESC').all() as Record<string, unknown>[]).map((row) => ({ id: Number(row.id), filename: String(row.filename), createdAt: String(row.created_at), eventCount: Number(row.event_count) })),
  }
}

export function updateAlertStatus(id: string, status: AlertStatus) {
  ensureSchema()
  const result = getDatabase().prepare('UPDATE alerts SET status = ? WHERE id = ?').run(status, id)
  if (Number(result.changes) === 0) throw new Error('Alert not found.')
}

function parseUpload(filename: string, content: string): Event[] {
  const now = new Date().toISOString()
  const extension = filename.toLowerCase().split('.').pop()
  if (extension === 'json') {
    const parsed = JSON.parse(content) as unknown
    const records = Array.isArray(parsed) ? parsed : [parsed]
    return records.map((record, index) => {
      const value = record as Record<string, unknown>
      const rawLog = JSON.stringify(record)
      return { id: `upload-${Date.now()}-${index}`, timestamp: String(value.timestamp ?? now), eventType: String(value.eventType ?? value.event_type ?? 'UPLOADED_EVENT'), source: String(value.source ?? 'upload'), hostname: String(value.hostname ?? 'uploaded-host'), username: String(value.username ?? 'unknown'), sourceIp: value.sourceIp ? String(value.sourceIp) : value.source_ip ? String(value.source_ip) : undefined, severity: (String(value.severity ?? 'LOW').toUpperCase() as Severity), message: String(value.message ?? rawLog), rawLog }
    })
  }

  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (extension === 'csv' && lines.length > 1) {
    const headers = lines[0].split(',').map((header) => header.trim().toLowerCase())
    return lines.slice(1).map((line, index) => {
      const values = line.split(',').map((value) => value.trim())
      const record = Object.fromEntries(headers.map((header, headerIndex) => [header, values[headerIndex] ?? '']))
      return { id: `upload-${Date.now()}-${index}`, timestamp: record.timestamp || now, eventType: record.eventtype || record.event_type || 'UPLOADED_EVENT', source: record.source || 'upload', hostname: record.hostname || 'uploaded-host', username: record.username || 'unknown', sourceIp: record.sourceip || record.source_ip || undefined, severity: (record.severity || 'LOW').toUpperCase() as Severity, message: record.message || line, rawLog: line }
    })
  }

  return lines.map((line, index) => ({ id: `upload-${Date.now()}-${index}`, timestamp: now, eventType: 'UPLOADED_LOG', source: 'upload', hostname: 'uploaded-host', username: 'unknown', severity: 'LOW' as Severity, message: line, rawLog: line }))
}

export function saveUpload(filename: string, content: string) {
  ensureSchema()
  const parsedEvents = parseUpload(filename, content)
  const database = getDatabase()
  const insertEvent = database.prepare('INSERT OR REPLACE INTO events (id, timestamp, event_type, source, hostname, username, source_ip, severity, message, raw_log) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertUpload = database.prepare('INSERT INTO uploads (filename, content, created_at, event_count) VALUES (?, ?, ?, ?)')
  database.exec('BEGIN')
  try {
    for (const event of parsedEvents) insertEvent.run(event.id, event.timestamp, event.eventType, event.source, event.hostname, event.username, event.sourceIp ?? null, event.severity, event.message, event.rawLog)
    insertUpload.run(filename, content, new Date().toISOString(), parsedEvents.length)
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
  return parsedEvents.length
}
