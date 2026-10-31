import { useCallback, useState } from 'react'
import { usePortalData } from '@/context/portal'
import { useToast } from '@/context/toast'
import type { Invoice } from '@/types'
import { downloadInvoicePdf } from './invoice-pdf'

export function useInvoiceDownload() {
  const { customer } = usePortalData()
  const toast = useToast()
  const [busyId, setBusyId] = useState<string | null>(null)

  const download = useCallback(
    async (invoice: Invoice) => {
      setBusyId(invoice.id)
      try {
        await downloadInvoicePdf(invoice, customer)
        toast.success('Invoice downloaded', `${invoice.number}.pdf was saved to your device.`)
      } catch {
        toast.error('Couldn’t create the PDF', 'Please try again in a moment.')
      } finally {
        setBusyId(null)
      }
    },
    [customer, toast],
  )

  return { download, busyId }
}
