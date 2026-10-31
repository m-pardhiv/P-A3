const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '[::1]'])

type Input = {
  nodeEnv?: string
  databaseUrl: string
  reset: boolean
  allowDemoSeed?: boolean
  allowReset?: boolean
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

/**
 * Returns why the seed script must not run, or null when it may. The demo accounts share one public
 * password and `--reset` truncates every table, so both stay away from anything that is not a
 * local database unless someone says so explicitly.
 */
export function seedBlocker(input: Input): string | null {
  const production = input.nodeEnv === 'production'
  const local = LOCAL_HOSTS.has(hostOf(input.databaseUrl))

  if (input.reset) {
    if (production) return 'Refusing to wipe a production database.'
    if (!local && !input.allowReset) {
      return 'Refusing to wipe a database that is not on this machine. Set ALLOW_DB_RESET=true if you really mean it.'
    }
  }
  if ((production || !local) && !input.allowDemoSeed) {
    return 'The demo data uses a public password, so it only loads into a local database. Set ALLOW_DEMO_SEED=true to load it anyway.'
  }
  return null
}
