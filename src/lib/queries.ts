import { queryOptions } from '@tanstack/react-query'
import { getFormOptions } from '~/server/functions/options'

export const formOptionsQuery = queryOptions({
  queryKey: ['options'],
  queryFn: () => getFormOptions(),
})
