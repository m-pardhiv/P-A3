export function PendingPage() {
  return (
    <div role="status" className="flex items-center gap-3 px-4 py-16 text-muted sm:px-8">
      <span
        aria-hidden
        className="size-5 animate-spin rounded-full border-2 border-line border-t-ink"
      />
      Loading
    </div>
  )
}
