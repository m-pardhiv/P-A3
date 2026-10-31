import { mockApi } from './mock/client'
import type { PortalApi } from './types'

/**
 * Single seam between the UI and data. Swap `mockApi` for a real implementation of
 * `PortalApi` (REST, GraphQL, …) when a backend is available — no UI changes needed.
 */
export const api: PortalApi = mockApi

export { ApiError } from './types'
export type { PortalApi } from './types'

/** Sample password for the preview, shown as a hint on the change-password form. */
export { DEMO_PASSWORD, DEMO_EMAIL, PREVIEW_ACCOUNTS } from './mock/client'
