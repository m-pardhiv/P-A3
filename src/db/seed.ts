import bcrypt from 'bcryptjs'
import { drizzle } from 'drizzle-orm/postgres-js'
import { createClient } from './client'
import {
  customers,
  paymentTerms,
  plans,
  products,
  productVariants,
  taxRules,
  users,
} from './schema'

const DEMO_PASSWORD = 'Brightloop@2026'
const paise = (rupees: number) => Math.round(rupees * 100)

const client = createClient(1)
const db = drizzle(client)

const reset = process.argv.includes('--reset')
if (reset && process.env.NODE_ENV === 'production') {
  throw new Error('Refusing to wipe a production database.')
}

const existing = await db.select({ id: users.id }).from(users).limit(1)
if (existing.length > 0 && !reset) {
  console.log('Database already has data. Run `pnpm db:seed --reset` to wipe it and reseed.')
  await client.end()
  process.exit(0)
}

if (reset) {
  await client`TRUNCATE users, customers, products, plans, tax_rules, payment_terms RESTART IDENTITY CASCADE`
}

const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)

await db.transaction(async (tx) => {
  await tx.insert(users).values([
    { email: 'admin@brightloop.example', name: 'Meera Iyer', passwordHash, role: 'admin' },
    { email: 'staff@brightloop.example', name: 'Rohan Kulkarni', passwordHash, role: 'staff' },
  ])

  const demoCustomers = [
    { name: 'Asha Rao', company: 'Rao Textiles', phone: '+91 98450 10001', city: 'Bengaluru' },
    { name: 'Vikram Shah', company: 'Shah Logistics', phone: '+91 98200 10002', city: 'Mumbai' },
    { name: 'Neha Verma', company: 'Verma Foods', phone: '+91 98100 10003', city: 'Delhi' },
    { name: 'Arjun Menon', company: 'Menon Traders', phone: '+91 94470 10004', city: 'Kochi' },
    { name: 'Priya Nair', company: 'Nair Clinics', phone: '+91 98940 10005', city: 'Chennai' },
  ]
  for (const customer of demoCustomers) {
    const email = `${customer.name.split(' ')[0].toLowerCase()}@customer.example`
    const [user] = await tx
      .insert(users)
      .values({ email, name: customer.name, passwordHash, role: 'customer' })
      .returning({ id: users.id })
    await tx.insert(customers).values({
      userId: user.id,
      name: customer.name,
      company: customer.company,
      email,
      phone: customer.phone,
      address: customer.city,
    })
  }

  const [crm, support, cloud, training] = await tx
    .insert(products)
    .values([
      {
        name: 'Brightloop CRM seat',
        type: 'software',
        salesPrice: paise(1200),
        costPrice: paise(300),
      },
      {
        name: 'Priority support',
        type: 'service',
        salesPrice: paise(2500),
        costPrice: paise(900),
      },
      { name: 'Cloud storage', type: 'software', salesPrice: paise(800), costPrice: paise(250) },
      {
        name: 'Team training session',
        type: 'training',
        salesPrice: paise(5000),
        costPrice: paise(2000),
        notes: 'Taxed at the 5% training rate.',
      },
    ])
    .returning({ id: products.id })

  await tx.insert(productVariants).values([
    { productId: crm.id, attribute: 'Brand', value: 'Odoo', extraPrice: paise(560) },
    { productId: crm.id, attribute: 'Brand', value: 'Zoho', extraPrice: paise(420) },
    { productId: support.id, attribute: 'Hours', value: '24x7', extraPrice: paise(1500) },
    { productId: cloud.id, attribute: 'Capacity', value: '100 GB', extraPrice: 0 },
    { productId: cloud.id, attribute: 'Capacity', value: '1 TB', extraPrice: paise(1400) },
    { productId: training.id, attribute: 'Format', value: 'On site', extraPrice: paise(3000) },
  ])

  await tx.insert(taxRules).values([
    { name: 'GST 18%', ratePercent: 18, isDefault: true },
    { name: 'GST 5% training', ratePercent: 5, productType: 'training' },
  ])

  await tx.insert(paymentTerms).values([
    { name: 'Immediate', daysDue: 0 },
    { name: 'Net 15', daysDue: 15 },
    { name: 'Net 30', daysDue: 30 },
  ])

  await tx.insert(plans).values([
    {
      name: 'Daily pass',
      price: paise(99),
      billingPeriod: 'daily',
      autoClose: true,
      closable: true,
      pausable: false,
      renewable: false,
    },
    {
      name: 'Weekly starter',
      price: paise(499),
      billingPeriod: 'weekly',
      autoClose: true,
      closable: true,
      pausable: true,
      renewable: true,
    },
    {
      name: 'Monthly standard',
      price: paise(1999),
      billingPeriod: 'monthly',
      autoClose: false,
      closable: true,
      pausable: true,
      renewable: true,
    },
    {
      name: 'Monthly team',
      price: paise(4999),
      billingPeriod: 'monthly',
      minQuantity: 5,
      autoClose: false,
      closable: false,
      pausable: true,
      renewable: true,
    },
    {
      name: 'Yearly business',
      price: paise(19999),
      billingPeriod: 'yearly',
      autoClose: false,
      closable: false,
      pausable: false,
      renewable: true,
    },
  ])
})

console.log(`
Demo accounts (password for all: ${DEMO_PASSWORD})
  admin     admin@brightloop.example
  staff     staff@brightloop.example
  customer  asha@customer.example, vikram@customer.example, neha@customer.example,
            arjun@customer.example, priya@customer.example
`)

await client.end()
