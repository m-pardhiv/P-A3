import { createFileRoute } from '@tanstack/react-router'
import { PlaceholderPage } from '~/components/placeholder-page'

export const Route = createFileRoute('/_app/products/$id')({
  component: () => (
    <PlaceholderPage title="Product" part={2} parent={{ label: 'Products', to: '/products' }} />
  ),
})
