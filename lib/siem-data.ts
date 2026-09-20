export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type AlertStatus = 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED'

export type Event = { id: string; timestamp: string; eventType: string; source: string; hostname: string; username: string; sourceIp?: string; severity: Severity; message: string; rawLog: string }
export type Alert = { id: string; title: string; description: string; severity: Severity; status: AlertStatus; rule: string; hostname: string; username: string; sourceIp?: string; firstSeen: string; lastSeen: string; eventCount: number; eventIds: string[] }

export const events: Event[] = [
  { id: 'evt-1042', timestamp: '2026-09-19T14:31:02Z', eventType: 'AUTH_FAILURE', source: 'linux', hostname: 'WEB-SERVER-01', username: 'admin', sourceIp: '192.168.1.55', severity: 'LOW', message: 'Failed SSH authentication', rawLog: 'Sep 19 14:31:02 WEB-SERVER-01 sshd: Failed password for admin from 192.168.1.55' },
  { id: 'evt-1041', timestamp: '2026-09-19T14:29:44Z', eventType: 'AUTH_FAILURE', source: 'linux', hostname: 'WEB-SERVER-01', username: 'admin', sourceIp: '192.168.1.55', severity: 'LOW', message: 'Failed SSH authentication', rawLog: 'Sep 19 14:29:44 WEB-SERVER-01 sshd: Failed password for admin from 192.168.1.55' },
  { id: 'evt-1040', timestamp: '2026-09-19T14:28:11Z', eventType: 'AUTH_SUCCESS', source: 'linux', hostname: 'WEB-SERVER-01', username: 'admin', sourceIp: '192.168.1.55', severity: 'MEDIUM', message: 'Successful SSH authentication after failures', rawLog: 'Sep 19 14:28:11 WEB-SERVER-01 sshd: Accepted password for admin from 192.168.1.55' },
  { id: 'evt-1039', timestamp: '2026-09-19T03:12:26Z', eventType: 'POWERSHELL_EXECUTION', source: 'windows', hostname: 'WIN-PC-014', username: 'jsmith', severity: 'HIGH', message: 'Encoded PowerShell command observed', rawLog: 'EventID=4688 Host=WIN-PC-014 User=jsmith CommandLine=powershell.exe -enc SQBFAFgA...' },
  { id: 'evt-1038', timestamp: '2026-09-19T02:58:09Z', eventType: 'ACCOUNT_CREATED', source: 'windows', hostname: 'WIN-PC-014', username: 'svc-backup', severity: 'HIGH', message: 'New local account created', rawLog: 'EventID=4720 Host=WIN-PC-014 SubjectUser=jsmith TargetUser=svc-backup' },
  { id: 'evt-1037', timestamp: '2026-09-19T02:59:10Z', eventType: 'GROUP_MEMBERSHIP_CHANGE', source: 'windows', hostname: 'WIN-PC-014', username: 'svc-backup', severity: 'HIGH', message: 'Account added to local Administrators group', rawLog: 'EventID=4732 Host=WIN-PC-014 Member=svc-backup Group=Administrators' },
  { id: 'evt-1036', timestamp: '2026-09-18T21:44:03Z', eventType: 'SUDO_COMMAND', source: 'linux', hostname: 'DB-NODE-02', username: 'mrivera', severity: 'MEDIUM', message: 'Privileged command executed', rawLog: 'Sep 18 21:44:03 DB-NODE-02 sudo: mrivera : COMMAND=/usr/bin/systemctl restart nginx' },
  { id: 'evt-1035', timestamp: '2026-09-18T18:20:40Z', eventType: 'AUTH_SUCCESS', source: 'linux', hostname: 'JUMPBOX-01', username: 'analyst', sourceIp: '10.20.0.18', severity: 'LOW', message: 'Successful SSH authentication', rawLog: 'Sep 18 18:20:40 JUMPBOX-01 sshd: Accepted publickey for analyst from 10.20.0.18' },
]

export const alerts: Alert[] = [
  { id: 'ALT-204', title: 'Possible Brute Force', description: 'Repeated authentication failures from one source against the same account.', severity: 'HIGH', status: 'OPEN', rule: 'BRUTE_FORCE_5_IN_5M', hostname: 'WEB-SERVER-01', username: 'admin', sourceIp: '192.168.1.55', firstSeen: '2026-09-19T14:22:09Z', lastSeen: '2026-09-19T14:31:02Z', eventCount: 8, eventIds: ['evt-1042', 'evt-1041', 'evt-1040'] },
  { id: 'ALT-203', title: 'Possible Suspicious PowerShell Activity', description: 'Encoded PowerShell parameters were present in process event data.', severity: 'HIGH', status: 'ACKNOWLEDGED', rule: 'POWERSHELL_ENCODED', hostname: 'WIN-PC-014', username: 'jsmith', firstSeen: '2026-09-19T03:12:26Z', lastSeen: '2026-09-19T03:12:26Z', eventCount: 1, eventIds: ['evt-1039'] },
  { id: 'ALT-202', title: 'New Administrator Account', description: 'A newly created account was added to an administrator-equivalent group.', severity: 'HIGH', status: 'OPEN', rule: 'NEW_ADMIN_ACCOUNT', hostname: 'WIN-PC-014', username: 'svc-backup', firstSeen: '2026-09-19T02:58:09Z', lastSeen: '2026-09-19T02:59:10Z', eventCount: 2, eventIds: ['evt-1038', 'evt-1037'] },
  { id: 'ALT-201', title: 'Login After Multiple Failures', description: 'A successful authentication followed several failures in the same time window.', severity: 'MEDIUM', status: 'RESOLVED', rule: 'LOGIN_AFTER_FAILURES', hostname: 'WEB-SERVER-01', username: 'admin', sourceIp: '192.168.1.55', firstSeen: '2026-09-19T14:28:11Z', lastSeen: '2026-09-19T14:28:11Z', eventCount: 4, eventIds: ['evt-1040', 'evt-1041'] },
  { id: 'ALT-200', title: 'Unusual Login Time', description: 'A login occurred between midnight and 05:00. This is a heuristic requiring context.', severity: 'LOW', status: 'OPEN', rule: 'UNUSUAL_LOGIN_TIME', hostname: 'JUMPBOX-01', username: 'analyst', firstSeen: '2026-09-18T03:02:00Z', lastSeen: '2026-09-18T03:02:00Z', eventCount: 1, eventIds: [] },
]

export const severityStyles: Record<Severity, string> = { CRITICAL: 'bg-[#f8e3e2] text-[#a63f3a]', HIGH: 'bg-[#f9e7de] text-[#b45d3f]', MEDIUM: 'bg-[#fbf0dc] text-[#a77822]', LOW: 'bg-[#e3f1ef] text-[#3d7f78]' }
export const statusStyles: Record<AlertStatus, string> = { OPEN: 'bg-[#f9e7de] text-[#b45d3f]', ACKNOWLEDGED: 'bg-[#fbf0dc] text-[#a77822]', RESOLVED: 'bg-[#e3f1ef] text-[#3d7f78]' }

export function formatTime(value: string) { return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
export function formatDate(value: string) { return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value)) }
export const hosts = ['WEB-SERVER-01', 'WIN-PC-014', 'DB-NODE-02', 'JUMPBOX-01']
export const users = ['admin', 'jsmith', 'svc-backup', 'mrivera', 'analyst']
export const detectionRules = [
  ['BRUTE_FORCE_5_IN_5M', 'Possible Brute Force', '5+ failed authentications from the same source against the same user within 5 minutes.', 'HIGH'],
  ['LOGIN_AFTER_FAILURES', 'Login After Multiple Failures', 'A successful login follows repeated failures in a short window.', 'MEDIUM'],
  ['NEW_ADMIN_ACCOUNT', 'New Administrator Account', 'A new account is created and added to an administrator-equivalent group.', 'HIGH'],
  ['POWERSHELL_ENCODED', 'Suspicious PowerShell Activity', 'Detects encoded or obfuscated PowerShell parameters in event text.', 'HIGH'],
  ['UNUSUAL_LOGIN_TIME', 'Unusual Login Time', 'Flags logins between midnight and 05:00 as a review heuristic.', 'LOW'],
] as const

export function analyzeAlert(alert: Alert) { return { summary: `This ${alert.severity.toLowerCase()}-severity alert was generated by the deterministic ${alert.rule} rule. The evidence indicates suspicious activity that should be validated against expected maintenance, automation, and user context; it does not by itself prove compromise.`, steps: ['Validate the user and host context with the system owner.', 'Review the related events and surrounding authentication activity.', 'Check whether the source IP and process behavior are expected.', 'Document the disposition and resolve only after evidence supports it.'], confidence: alert.severity === 'HIGH' ? 'High confidence in rule match; medium confidence in malicious intent.' : 'Medium confidence; investigate context before escalating.' } }
