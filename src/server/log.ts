/**
 * One JSON object per line on stdout or stderr, so any log collector can parse it. It never logs
 * the error's message for unexpected failures from the database driver in full, only a clipped one.
 */
const clip = (text: string) => text.slice(0, 500)

function write(level: 'info' | 'warn' | 'error', event: string, detail?: unknown) {
  const entry: Record<string, unknown> = { time: new Date().toISOString(), level, event }
  if (detail instanceof Error) {
    entry.error = clip(detail.message)
    entry.name = detail.name
  } else if (detail !== undefined) {
    entry.detail = detail
  }
  const line = JSON.stringify(entry)
  if (level === 'info') console.info(line)
  else if (level === 'warn') console.warn(line)
  else console.error(line)
}

export const log = {
  info: (event: string, detail?: unknown) => write('info', event, detail),
  warn: (event: string, detail?: unknown) => write('warn', event, detail),
  error: (event: string, detail?: unknown) => write('error', event, detail),
}
