import type { ReactNode } from 'react'
import type { Page } from '~/shared/schemas/pagination'

export type Column<T> = {
  header: string
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
}

export function DataTable<T>(props: {
  columns: Column<T>[]
  data: Page<T>
  rowKey: (row: T) => string
  onPageChange: (page: number) => void
  empty: ReactNode
}) {
  const { columns, data, rowKey, onPageChange, empty } = props
  if (data.total === 0) return empty

  const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize))
  const firstRow = (data.page - 1) * data.pageSize + 1
  const lastRow = Math.min(data.page * data.pageSize, data.total)

  return (
    <div className="overflow-hidden rounded-card border border-border/80 bg-card shadow-soft">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border/70 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={`px-4 py-3.5 font-bold whitespace-nowrap first:pl-5 last:pr-5 ${column.align === 'right' ? 'text-right' : ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular">
            {data.rows.map((row) => (
              <tr
                key={rowKey(row)}
                className="border-b border-border/60 transition-colors last:border-0 hover:bg-accent/30"
              >
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-4 py-3.5 text-sm first:pl-5 last:pr-5 ${column.align === 'right' ? 'text-right' : ''}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 px-5 py-3 text-[13px] text-muted-foreground">
        <span className="tabular">
          {firstRow} to {lastRow} of {data.total}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            disabled={data.page <= 1}
            onClick={() => onPageChange(data.page - 1)}
          >
            Previous
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={data.page >= lastPage}
            onClick={() => onPageChange(data.page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
