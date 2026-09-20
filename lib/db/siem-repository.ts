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

function parseLogTimestamp(value: string | undefined, fallback: string) {
  if (!value) return fallback
  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  const syslogParsed = new Date(`${new Date().getUTCFullYear()} ${value} UTC`)
  return Number.isNaN(syslogParsed.getTime()) ? fallback : syslogParsed.toISOString()
}

function parseTextLine(line: string, index: number, now: string): Event {
  const prefix = line.match(/^(?<timestamp>[A-Z][a-z]{2}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+(?<hostname>\S+)/)
  const timestamp = parseLogTimestamp(prefix?.groups?.timestamp, now)
  const hostname = prefix?.groups?.hostname ?? 'uploaded-host'
  const id = `upload-${Date.now()}-${index}`
  const authFailure = line.match(/Failed password for (?<username>\S+) from (?<sourceIp>\S+)/i)
  if (authFailure?.groups) return { id, timestamp, eventType: 'AUTH_FAILURE', source: 'linux', hostname, username: authFailure.groups.username, sourceIp: authFailure.groups.sourceIp, severity: 'LOW', message: 'Failed SSH authentication', rawLog: line }
  const authSuccess = line.match(/Accepted (?:password|publickey) for (?<username>\S+) from (?<sourceIp>\S+)/i)
  if (authSuccess?.groups) return { id, timestamp, eventType: 'AUTH_SUCCESS', source: 'linux', hostname, username: authSuccess.groups.username, sourceIp: authSuccess.groups.sourceIp, severity: 'LOW', message: 'Successful SSH authentication', rawLog: line }
  const powershell = line.match(/EventID=4688\s+Host=(?<hostname>\S+)\s+User=(?<username>\S+)\s+CommandLine=(?<command>.*)/i)
  if (powershell?.groups) return { id, timestamp, eventType: 'POWERSHELL_EXECUTION', source: 'windows', hostname: powershell.groups.hostname, username: powershell.groups.username, severity: 'HIGH', message: 'Encoded PowerShell command observed', rawLog: line }
  const accountCreated = line.match(/EventID=4720\s+Host=(?<hostname>\S+)\s+SubjectUser=(?<subject>\S+)\s+TargetUser=(?<username>\S+)/i)
  if (accountCreated?.groups) return { id, timestamp, eventType: 'ACCOUNT_CREATED', source: 'windows', hostname: accountCreated.groups.hostname, username: accountCreated.groups.username, severity: 'HIGH', message: 'New local account created', rawLog: line }
  const groupChange = line.match(/EventID=4732\s+Host=(?<hostname>\S+)\s+Member=(?<username>\S+)\s+Group=Administrators/i)
  if (groupChange?.groups) return { id, timestamp, eventType: 'GROUP_MEMBERSHIP_CHANGE', source: 'windows', hostname: groupChange.groups.hostname, username: groupChange.groups.username, severity: 'HIGH', message: 'Account added to local Administrators group', rawLog: line }
  const sudo = line.match(/sudo:\s+(?<username>\S+)\s+:\s+COMMAND=(?<command>.*)/i)
  if (sudo?.groups) return { id, timestamp, eventType: 'SUDO_COMMAND', source: 'linux', hostname, username: sudo.groups.username, severity: 'MEDIUM', message: 'Privileged command executed', rawLog: line }
  return { id, timestamp, eventType: 'UPLOADED_LOG', source: 'upload', hostname, username: 'unknown', severity: 'LOW', message: line, rawLog: line }
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

  return lines.map((line, index) => parseTextLine(line, index, now))
}

type AlertCandidate = Omit<Alert, 'id' | 'status'>

function sameScope(left: Event, right: Event) {
  return left.hostname === right.hostname && left.username === right.username && left.sourceIp === right.sourceIp
}

function candidate(rule: string, title: string, description: string, severity: Severity, related: Event[]): AlertCandidate {
  const ordered = [...related].sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp))
  const first = ordered[0]
  const last = ordered[ordered.length - 1]
  return { title, description, severity, rule, hostname: first.hostname, username: first.username, sourceIp: first.sourceIp, firstSeen: first.timestamp, lastSeen: last.timestamp, eventCount: ordered.length, eventIds: ordered.map((event) => event.id) }
}

function findDetectedAlerts(events: Event[]): AlertCandidate[] {
  const detected: AlertCandidate[] = []
  const failures = events.filter((event) => event.eventType === 'AUTH_FAILURE' && event.sourceIp)
  const failureGroups = new Map<string, Event[]>()
  for (const event of failures) {
    const key = `${event.hostname}|${event.username}|${event.sourceIp}`
    failureGroups.set(key, [...(failureGroups.get(key) ?? []), event])
  }
  for (const group of failureGroups.values()) {
    const ordered = [...group].sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp))
    for (let start = 0; start <= ordered.length - 5; start += 1) {
      const window = ordered.slice(start, start + 5)
      if (Date.parse(window[4].timestamp) - Date.parse(window[0].timestamp) <= 5 * 60 * 1000) {
        detected.push(candidate('BRUTE_FORCE_5_IN_5M', 'Possible Brute Force', 'Repeated authentication failures from one source against the same account.', 'HIGH', window))
        break
      }
    }
  }

  for (const event of events.filter((item) => item.eventType === 'POWERSHELL_EXECUTION' && /(?:-enc|-encodedcommand)\s+/i.test(item.rawLog))) {
    detected.push(candidate('POWERSHELL_ENCODED', 'Possible Suspicious PowerShell Activity', 'Encoded PowerShell parameters were present in process event data.', 'HIGH', [event]))
  }

  for (const created of events.filter((event) => event.eventType === 'ACCOUNT_CREATED')) {
    const membership = events.find((event) => event.eventType === 'GROUP_MEMBERSHIP_CHANGE' && sameScope(event, created))
    if (membership) detected.push(candidate('NEW_ADMIN_ACCOUNT', 'New Administrator Account', 'A newly created account was added to an administrator-equivalent group.', 'HIGH', [created, membership]))
  }

  for (const success of events.filter((event) => event.eventType === 'AUTH_SUCCESS' && event.sourceIp)) {
    const relatedFailures = failures.filter((failure) => sameScope(failure, success) && Date.parse(failure.timestamp) <= Date.parse(success.timestamp) && Date.parse(success.timestamp) - Date.parse(failure.timestamp) <= 5 * 60 * 1000)
    if (relatedFailures.length >= 2) detected.push(candidate('LOGIN_AFTER_FAILURES', 'Login After Multiple Failures', 'A successful authentication followed several failures in the same time window.', 'MEDIUM', [...relatedFailures, success]))
    const hour = new Date(success.timestamp).getUTCHours()
    if (hour < 5) detected.push(candidate('UNUSUAL_LOGIN_TIME', 'Unusual Login Time', 'A login occurred between midnight and 05:00. This is a heuristic requiring context.', 'LOW', [success]))
  }
  return detected
}

function upsertDetectedAlert(database: ReturnType<typeof getDatabase>, alert: AlertCandidate) {
  const existing = database.prepare('SELECT * FROM alerts WHERE rule = ? AND hostname = ? AND username = ? AND ((source_ip = ?) OR (source_ip IS NULL AND ? IS NULL)) LIMIT 1').get(alert.rule, alert.hostname, alert.username, alert.sourceIp ?? null, alert.sourceIp ?? null) as Record<string, unknown> | undefined
  if (existing) {
    database.prepare('UPDATE alerts SET first_seen = ?, last_seen = ?, event_count = ?, event_ids = ? WHERE id = ?').run(alert.firstSeen, alert.lastSeen, alert.eventCount, JSON.stringify(alert.eventIds), String(existing.id))
    return
  }
  const nextId = Number(database.prepare("SELECT COALESCE(MAX(CAST(SUBSTR(id, 5) AS INTEGER)), 199) + 1 AS next_id FROM alerts").get()?.next_id ?? 200)
  database.prepare('INSERT INTO alerts (id, title, description, severity, status, rule, hostname, username, source_ip, first_seen, last_seen, event_count, event_ids) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(`ALT-${nextId}`, alert.title, alert.description, alert.severity, 'OPEN', alert.rule, alert.hostname, alert.username, alert.sourceIp ?? null, alert.firstSeen, alert.lastSeen, alert.eventCount, JSON.stringify(alert.eventIds))
}

function refreshDetectedAlerts(database: ReturnType<typeof getDatabase>) {
  const rows = database.prepare('SELECT * FROM events ORDER BY timestamp ASC').all() as Record<string, unknown>[]
  for (const alert of findDetectedAlerts(rows.map(rowToEvent))) upsertDetectedAlert(database, alert)
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
    refreshDetectedAlerts(database)
    database.exec('COMMIT')
  } catch (error) {
    database.exec('ROLLBACK')
    throw error
  }
  return parsedEvents.length
}
