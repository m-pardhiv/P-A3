import { Link } from '@tanstack/react-router'
import { EmptyState } from './empty-state'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        title="Page not found"
        message="This page does not exist, or you do not have access to it."
        action={
          <Link to="/" className="btn btn-primary mt-2">
            Go to home
          </Link>
        }
      />
    </div>
  )
}
