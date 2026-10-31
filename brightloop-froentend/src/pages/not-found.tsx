import { Compass } from 'lucide-react'
import { EmptyState } from '@/components/common/states'
import { LinkButton } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useDocumentTitle } from '@/hooks/use-document-title'

export default function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <Card>
      <EmptyState
        icon={Compass}
        title="We couldn’t find that page"
        description="The link may be broken or the page may have moved."
        action={<LinkButton to="/overview">Back to overview</LinkButton>}
        className="py-20"
      />
    </Card>
  )
}
