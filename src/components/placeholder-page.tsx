import { EmptyState } from './empty-state'
import { type Breadcrumb, PageHeader } from './page-header'

export function PlaceholderPage(props: { title: string; part: 2 | 3 | 4; parent?: Breadcrumb }) {
  return (
    <>
      <PageHeader title={props.title} breadcrumbs={props.parent ? [props.parent] : undefined} />
      <EmptyState
        title={`${props.title} arrives in Part ${props.part}`}
        message={`This page is part of the navigation now and gets its real data in Part ${props.part} of the build.`}
      />
    </>
  )
}
