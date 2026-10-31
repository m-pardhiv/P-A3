/** The tests never use the app's own database: the URL points at "<name>_test" instead. */
export function testDatabaseUrl() {
  const explicit = process.env.TEST_DATABASE_URL
  if (explicit) return explicit

  const base = process.env.DATABASE_URL
  if (!base) throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.')
  return base.replace(
    /\/([^/?]+)(\?.*)?$/,
    (_match, name: string, query = '') =>
      `/${name.endsWith('_test') ? name : `${name}_test`}${query}`,
  )
}
