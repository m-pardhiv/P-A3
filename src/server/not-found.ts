import { notFound } from '@tanstack/react-router'
import { z } from 'zod'

/** Turns a malformed URL id into a 404 before Postgres rejects it as a bad uuid. */
export function requireUuid(id: string) {
  if (!z.uuid().safeParse(id).success) throw notFound()
  return id
}

export function requireFound<T>(row: T | undefined): T {
  if (row === undefined) throw notFound()
  return row
}

/** Escapes LIKE wildcards so a search for "100%" matches that text. */
export const containsPattern = (text: string) => `%${text.replace(/[\\%_]/g, '\\$&')}%`
