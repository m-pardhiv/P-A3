export type FieldErrors = Record<string, string>

/** What a form-backing server function returns. Expected failures are data, not exceptions. */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error?: string; fieldErrors?: FieldErrors }
