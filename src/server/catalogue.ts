import { inArray } from 'drizzle-orm'
import { db } from '~/db/client'
import { products, productVariants, taxRules } from '~/db/schema'
import type { Catalogue } from '~/server/domain/subscription'

type Reader = Pick<typeof db, 'select'>

/** Loads what the pure pricing functions need for these lines. */
export async function loadCatalogue(
  reader: Reader,
  lines: { productId: string; variantId: string | null }[],
): Promise<Catalogue> {
  const productIds = lines.map((line) => line.productId)
  const variantIds = lines.flatMap((line) => line.variantId ?? [])
  const [productRows, variantRows, rules] = await Promise.all([
    productIds.length ? reader.select().from(products).where(inArray(products.id, productIds)) : [],
    variantIds.length
      ? reader.select().from(productVariants).where(inArray(productVariants.id, variantIds))
      : [],
    reader.select().from(taxRules),
  ])
  return {
    products: new Map(productRows.map((product) => [product.id, product])),
    variants: new Map(variantRows.map((variant) => [variant.id, variant])),
    taxRules: rules,
  }
}
