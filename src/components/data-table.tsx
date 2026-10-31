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
    <div className="rounded-panel border border-line bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line text-sm text-muted">
              {columns.map((column) => (
                <th
                  key={column.header}
                  scope="col"
                  className={`px-4 py-3 font-medium ${column.align === 'right' ? 'text-right' : ''}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular">
            {data.rows.map((row) => (
              <tr key={rowKey(row)} className="border-b border-line last:border-0">
                {columns.map((column) => (
                  <td
                    key={column.header}
                    className={`px-4 py-3 ${column.align === 'right' ? 'text-right' : ''}`}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3 text-sm text-muted">
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
