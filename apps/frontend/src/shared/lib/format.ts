export function formatDuration(fromIso: string, toIso: string | null, now = Date.now()): string {
  const ms = (toIso ? Date.parse(toIso) : now) - Date.parse(fromIso)
  const seconds = Math.max(0, Math.round(ms / 1000))
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function formatLatency(ms: number | null): string {
  if (ms === null) return '–'
  return ms < 1 ? '<1 ms' : `${ms < 10 ? ms.toFixed(1) : Math.round(ms)} ms`
}
