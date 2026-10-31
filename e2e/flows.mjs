// End-to-end checks in a real browser. Run against a freshly seeded LOCAL database and a running app:
//   pnpm db:seed --reset
//   pnpm dev > /tmp/dev.log 2>&1 &
//   E2E_SERVER_LOG=/tmp/dev.log pnpm test:e2e
// It changes data (runs billing, records payments, creates accounts), so never point it at a real one.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { config } from 'dotenv'
import { chromium } from 'playwright-core'

config({ quiet: true })
const BASE = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL || !/@(localhost|127\.0\.0\.1)[:/]/.test(DATABASE_URL)) {
  throw new Error('The end-to-end checks only run against a database on this machine.')
}
const serverLog = () =>
  process.env.E2E_SERVER_LOG ? readFileSync(process.env.E2E_SERVER_LOG, 'utf8') : ''
const PW = 'Brightloop@2026'
const results = []
const check = (name, ok, detail = '') => {
  results.push({ name, ok })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '  -> ' + detail}`)
}
const psql = (q) =>
  execSync(`psql "${DATABASE_URL}" -At -c "${q.replaceAll('"', '\\"')}"`, {
    encoding: 'utf8',
  }).trim()

async function login(browser, email) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  const errors = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await page.fill('input[name=email]', email)
  await page.fill('input[name=password]', PW)
  await page.click('button[type=submit]')
  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 15000 })
  return { ctx, page, errors }
}
const bodyText = (page) => page.locator('body').innerText()
const BAD = /could not load|Page not found|Internal Server Error|Something went wrong/i

async function visitAll(page, paths, label) {
  for (const p of paths) {
    const res = await page.goto(BASE + p, { waitUntil: 'networkidle' })
    const t = await bodyText(page)
    const ok = res.status() < 400 && !BAD.test(t) && (await page.locator('h1').count()) > 0
    check(`${label} loads ${p}`, ok, `status ${res.status()} ${t.slice(0, 80).replace(/\n/g, ' ')}`)
  }
}

;(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })

  // ---------- ADMIN ----------
  const admin = await login(browser, 'admin@brightloop.example')
  const a = admin.page
  const navText = await a.locator('nav[aria-label=Main]').innerText()
  for (const item of [
    'Dashboard',
    'Subscriptions',
    'Invoices',
    'Payments',
    'Customers',
    'Products',
    'Plans',
    'Quotation Templates',
    'Billing',
    'Discounts',
    'Taxes',
    'Payment Terms',
    'Team',
  ])
    check(`admin sidebar has ${item}`, navText.includes(item), navText.replace(/\n/g, '|'))
  await visitAll(
    a,
    [
      '/dashboard',
      '/subscriptions',
      '/subscriptions/new',
      '/invoices',
      '/payments',
      '/customers',
      '/customers/new',
      '/products',
      '/products/new',
      '/plans',
      '/plans/new',
      '/quotation-templates',
      '/quotation-templates/new',
      '/billing',
      '/discounts',
      '/taxes',
      '/payment-terms',
      '/staff',
    ],
    'admin',
  )

  // dashboard content
  await a.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  const dash = await bodyText(a)
  for (const w of [
    'Active subscriptions',
    'Monthly recurring revenue',
    'Revenue collected',
    'Outstanding',
    'Overdue',
    'Recent payments',
    'Overdue invoices',
  ])
    check(`dashboard shows "${w}"`, dash.includes(w))
  check(
    'dashboard ageing buckets',
    /1 to 30/.test(dash) && /31 to 60/.test(dash) && /61/.test(dash),
    dash.slice(0, 200),
  )

  // Staff creation (admin)
  await a.goto(BASE + '/staff', { waitUntil: 'networkidle' })
  const email = `newstaff${Date.now()}@brightloop.example`
  await a.fill('input[name=name]', 'New Staffer')
  await a.fill('input[name=email]', email)
  await a.fill('input[name=password]', 'Weakpass')
  await a.click('button[type=submit]')
  await a.waitForTimeout(800)
  check(
    'staff weak password gives field error',
    /uppercase|special|characters/i.test(await bodyText(a)),
  )
  await a.fill('input[name=password]', 'Strong#Pass1')
  await a.click('button[type=submit]')
  await a.waitForTimeout(1200)
  check('admin created staff user', (await bodyText(a)).includes(email))

  // Billing: run twice
  const invBefore = Number(psql('select count(*) from invoices'))
  await a.goto(BASE + '/billing', { waitUntil: 'networkidle' })
  await a.click('button:has-text("Run billing now")')
  await a.waitForSelector('[role=status]:has-text("Billed up to")', { timeout: 20000 })
  const run1 = await a.locator('[role=status]:has-text("Billed up to")').innerText()
  const invMid = Number(psql('select count(*) from invoices'))
  console.log('  run1:', run1.replace(/\n/g, ' '))
  check('billing run 1 created invoices', invMid > invBefore, `${invBefore} -> ${invMid}`)
  await a.click('button:has-text("Run billing now")')
  await a
    .waitForFunction(
      () =>
        /0 invoices created/.test(document.body.innerText) &&
        document.querySelectorAll('[role=status]').length > 0,
      null,
      { timeout: 20000 },
    )
    .catch(() => {})
  const run2 = await a.locator('[role=status]:has-text("Billed up to")').innerText()
  const invAfter = Number(psql('select count(*) from invoices'))
  console.log('  run2:', run2.replace(/\n/g, ' '))
  check('billing run 2 creates zero new invoices', invAfter === invMid, `${invMid} -> ${invAfter}`)
  check('billing history lists runs', Number(psql('select count(*) from billing_runs')) >= 2)
  check(
    'discount applied on billing run',
    Number(
      psql("select count(*) from invoice_lines where description like 'Discount:%' and amount < 0"),
    ) > 0,
  )
  check(
    'no duplicate (subscription, period) live invoices',
    psql(
      "select count(*) from (select subscription_id, period_start from invoices where status<>'cancelled' group by 1,2 having count(*)>1) x",
    ) === '0',
  )

  // Invoice flow: pick a draft invoice
  await a.goto(BASE + '/invoices?status=draft', { waitUntil: 'networkidle' })
  await a.click('button:has-text("Confirm all drafts")')
  await a.click(
    '[role=dialog] button:has-text("Confirm all drafts"), dialog button:has-text("Confirm all drafts")',
  )
  await a.waitForTimeout(1500)
  check(
    'confirm all drafts leaves no drafts',
    psql("select count(*) from invoices where status='draft'") === '0',
  )

  const target = psql(
    "select id from invoices where status='confirmed' and amount_paid=0 and total>1000 order by number limit 1",
  )
  const total = Number(psql(`select total from invoices where id='${target}'`))
  await a.goto(`${BASE}/invoices/${target}`, { waitUntil: 'networkidle' })
  await a.selectOption('select[name=method]', 'upi')
  await a.fill('input[name=amount]', '10.00')
  await a.click('button:has-text("Record payment")')
  await a.waitForTimeout(1500)
  check(
    'partial payment keeps invoice confirmed',
    psql(`select status from invoices where id='${target}'`) === 'confirmed' &&
      psql(`select amount_paid from invoices where id='${target}'`) === '1000',
  )
  // overpayment
  await a.selectOption('select[name=method]', 'cash')
  await a.fill('input[name=amount]', String((total / 100) * 2))
  await a.click('button:has-text("Record payment")')
  await a.waitForTimeout(1200)
  check(
    'overpayment rejected',
    psql(`select amount_paid from invoices where id='${target}'`) === '1000',
    await bodyText(a).then((t) => t.slice(0, 100)),
  )
  // full remaining
  await a.fill('input[name=amount]', ((total - 1000) / 100).toFixed(2))
  await a.click('button:has-text("Record payment")')
  await a.waitForTimeout(1500)
  check(
    'full payment flips invoice to paid',
    psql(`select status from invoices where id='${target}'`) === 'paid',
  )
  check(
    'payments recorded with different methods',
    Number(psql('select count(distinct method) from payments')) >= 3,
  )
  await a.goto(`${BASE}/print/invoice/${target}`, { waitUntil: 'networkidle' })
  check('print page loads', /INV-/.test(await bodyText(a)))

  // send + cancel on another confirmed invoice
  const other = psql(
    "select id from invoices where status='confirmed' and amount_paid=0 order by number desc limit 1",
  )
  await a.goto(`${BASE}/invoices/${other}`, { waitUntil: 'networkidle' })
  await a.click('button:has-text("Send to customer")')
  await a.waitForTimeout(1500)
  check(
    'send sets sent_at',
    psql(`select sent_at is not null from invoices where id='${other}'`) === 't',
  )
  check('send logged email to console', /Invoice|INV-/.test(serverLog()))
  await a.click('button:has-text("Cancel invoice")')
  await a.click(
    'dialog button:has-text("Cancel invoice"), [role=dialog] button:has-text("Cancel invoice")',
  )
  await a.waitForTimeout(1500)
  check(
    'cancel invoice works',
    psql(`select status from invoices where id='${other}'`) === 'cancelled',
  )
  check(
    'paid invoice cannot be cancelled in UI',
    !(await (async () => {
      await a.goto(`${BASE}/invoices/${target}`, { waitUntil: 'networkidle' })
      return a.locator('button:visible:has-text("Cancel invoice")').count()
    })()),
  )

  // overdue
  await a.goto(BASE + '/invoices?overdue=true', { waitUntil: 'networkidle' })
  check('overdue filter shows overdue badges', (await a.locator('text=Overdue').count()) > 1)

  // ---------- STAFF ----------
  const staff = await login(browser, 'staff@brightloop.example')
  const s = staff.page
  const sNav = await s.locator('nav[aria-label=Main]').innerText()
  check(
    'staff sidebar hides admin-only items',
    !/Discounts|Taxes|Payment Terms|Team/.test(sNav),
    sNav.replace(/\n/g, '|'),
  )
  check(
    'staff sidebar has main items',
    [
      'Dashboard',
      'Subscriptions',
      'Invoices',
      'Payments',
      'Customers',
      'Products',
      'Plans',
      'Quotation Templates',
      'Billing',
    ].every((i) => sNav.includes(i)),
  )
  await visitAll(
    s,
    [
      '/dashboard',
      '/subscriptions',
      '/invoices',
      '/payments',
      '/customers',
      '/products',
      '/plans',
      '/quotation-templates',
      '/billing',
    ],
    'staff',
  )
  await s.goto(BASE + '/taxes', { waitUntil: 'networkidle' })
  check('staff redirected away from /taxes', !s.url().endsWith('/taxes'), s.url())
  await s.goto(BASE + '/plans/new', { waitUntil: 'networkidle' })
  check('staff cannot open /plans/new', !s.url().includes('/plans/new'), s.url())
  await s.goto(BASE + '/plans', { waitUntil: 'networkidle' })
  check(
    'staff plans list has no New plan button',
    (await s.locator('a:has-text("New plan")').count()) === 0,
  )

  // Staff: customer + subscription from template, lifecycle
  await s.goto(BASE + '/customers/new', { waitUntil: 'networkidle' })
  const cname = 'E2E Customer ' + Date.now()
  await s.fill('input[name=name]', cname)
  await s.fill('input[name=email]', `e2e${Date.now()}@example.com`)
  await s.click('button[type=submit]')
  await s.waitForTimeout(1500)
  check(
    'staff created customer',
    psql(`select count(*) from customers where name='${cname}'`) === '1',
  )
  const cid = psql(`select id from customers where name='${cname}'`)
  const tpl = psql("select id from quotation_templates where name='Starter quote'")
  await s.goto(BASE + '/subscriptions/new', { waitUntil: 'networkidle' })
  const selects = await s
    .locator('select')
    .evaluateAll((els) => els.map((e) => e.name || e.getAttribute('aria-label')))
  console.log('  new-sub selects:', selects.join(','))
  await s.selectOption('select[name=customerId]', cid)
  if (selects.includes('templateId')) await s.selectOption('select[name=templateId]', tpl)
  await s.waitForTimeout(500)
  const today = psql("select (now() at time zone 'Asia/Kolkata')::date")
  const startEl = s.locator('input[name=startDate]')
  await startEl.fill(today)
  const expEl = s.locator('input[name=expiryDate]')
  if (await expEl.count())
    await expEl.fill(psql("select ((now() at time zone 'Asia/Kolkata')::date + 365)"))
  await s.click('button[type=submit]')
  await s.waitForURL(/\/subscriptions\/[0-9a-f-]{36}/, { timeout: 15000 }).catch(() => {})
  await s.waitForLoadState('networkidle')
  await s.waitForSelector('h1:has-text("SUB-")', { timeout: 10000 }).catch(() => {})
  const subId = (s.url().match(/subscriptions\/([0-9a-f-]{36})/) || [])[1]
  check(
    'staff created subscription from template',
    !!subId,
    await bodyText(s).then((t) => t.slice(0, 200)),
  )
  if (subId) {
    const txt = await bodyText(s)
    check('subscription number format SUB-nnnnn', /SUB-\d{5}/.test(txt))
    console.log('  totals text:', txt.match(/Subtotal[\s\S]{0,80}/)?.[0].replace(/\n/g, ' '))
    const seq = ['Send quotation', 'Confirm', 'Activate']
    for (const label of seq) {
      const btn = s.locator(`main button:visible:has-text("${label}")`).first()
      const present = await btn.count()
      if (!present) {
        check(`button "${label}" available`, false, (await bodyText(s)).slice(0, 150))
        break
      }
      await btn.click()
      await s.waitForTimeout(1200)
    }
    check(
      'subscription reached active',
      psql(`select status from subscriptions where id='${subId}'`) === 'active',
      psql(`select status from subscriptions where id='${subId}'`),
    )
    check(
      'next_invoice_date set on activation',
      psql(`select next_invoice_date = start_date from subscriptions where id='${subId}'`) === 't',
    )
    const btns = await s.locator('main button:visible, main a.btn:visible').allInnerTexts()
    console.log('  active buttons:', btns.join('|'))
  }
  // button rule per plan
  const rows = psql(
    "select p.name||':'||p.pausable||':'||p.closable||':'||p.renewable from plans p where active order by name",
  ).split('\n')
  console.log('  plan flags:', rows.join(' ; '))
  const pick = async (planName, status) =>
    psql(
      `select s.id from subscriptions s join plans p on p.id=s.plan_id where p.name='${planName}' and s.status='${status}' limit 1`,
    )
  for (const [plan, expect] of [
    ['Yearly business', { Pause: false, Close: false, Renew: true }],
    ['Daily pass', { Pause: false, Close: true, Renew: false }],
    ['Monthly team', { Pause: true, Close: false, Renew: false }],
  ]) {
    const id = (await pick(plan, 'active')) || (await pick(plan, 'paused'))
    if (!id) {
      check(`seed has active/paused ${plan}`, false)
      continue
    }
    await s.goto(`${BASE}/subscriptions/${id}`, { waitUntil: 'networkidle' })
    for (const [k, v] of Object.entries(expect)) {
      const has = (await s.locator(`main button:visible:has-text("${k}")`).count()) > 0
      check(`${plan}: ${k} button ${v ? 'shown' : 'hidden'}`, has === v)
    }
  }
  // expired quotation cannot be confirmed
  const expired = psql(
    "select id from subscriptions where status='quotation' and quotation_valid_until < (now() at time zone 'Asia/Kolkata')::date limit 1",
  )
  await s.goto(`${BASE}/subscriptions/${expired}`, { waitUntil: 'networkidle' })
  check(
    'expired quotation shows no Confirm and a warning',
    (await s.locator('main button:has-text("Confirm")').count()) === 0 &&
      /expired/i.test(await bodyText(s)),
  )
  // renewal link
  const ren = psql('select id from subscriptions where renewed_from_id is not null limit 1')
  check('seed has a renewal draft linked by renewed_from_id', !!ren)

  // ---------- CUSTOMER ----------
  const cust = await login(browser, 'asha@customer.example')
  const c = cust.page
  await c.waitForSelector('nav[aria-label=Main]')
  const cNav = await bodyText(c)
  check('customer lands in portal', c.url().includes('/portal'), c.url())
  check(
    'customer sees portal nav',
    ['Overview', 'My Subscriptions', 'Invoices', 'Payment History', 'Plans', 'My Account'].every(
      (i) => cNav.includes(i),
    ),
  )
  await visitAll(
    c,
    [
      '/portal',
      '/portal/subscriptions',
      '/portal/invoices',
      '/portal/payments',
      '/portal/plans',
      '/portal/profile',
    ],
    'customer',
  )
  await c.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  check('customer redirected from /dashboard', c.url().includes('/portal'), c.url())
  const mine = psql(
    "select i.id from invoices i join customers cu on cu.id=i.customer_id where cu.email='asha@customer.example' and i.status in ('confirmed','paid') limit 1",
  )
  const theirs = psql(
    "select i.id from invoices i join customers cu on cu.id=i.customer_id where cu.email<>'asha@customer.example' and i.status in ('confirmed','paid') limit 1",
  )
  await c.goto(`${BASE}/portal/invoices/${mine}`, { waitUntil: 'networkidle' })
  check('customer opens own invoice', /INV-/.test(await bodyText(c)))
  await c.goto(`${BASE}/portal/invoices/${theirs}`, { waitUntil: 'networkidle' })
  check(
    'customer A gets 404 on customer B invoice (portal)',
    /not found/i.test(await bodyText(c)) &&
      !/INV-0/.test((await bodyText(c)).replace(/Page not found/, '')),
  )
  await c.goto(`${BASE}/print/invoice/${theirs}`, { waitUntil: 'networkidle' })
  check('customer A gets 404 on B invoice (print)', /not found/i.test(await bodyText(c)))
  await c.goto(BASE + '/portal/subscriptions', { waitUntil: 'networkidle' })
  const rowsCount = await c.locator('a[aria-label*="View details"]').count()
  const expectSubs = Number(
    psql(
      "select count(*) from subscriptions s join customers cu on cu.id=s.customer_id where cu.email='asha@customer.example' and s.status<>'draft'",
    ),
  )
  check(
    'portal subscription list shows only own non-draft',
    rowsCount === expectSubs,
    `${rowsCount} vs ${expectSubs}`,
  )

  // ---------- AUTH ----------
  const anon = await browser.newContext()
  const ap = await anon.newPage()
  await ap.goto(BASE + '/invoices', { waitUntil: 'networkidle' })
  check('anonymous redirected to /login', ap.url().includes('/login'), ap.url())
  const semail = `signup${Date.now()}@example.com`
  await ap.goto(BASE + '/signup', { waitUntil: 'networkidle' })
  await ap.fill('input[name=name]', 'Sign Up')
  await ap.fill('input[name=email]', semail)
  await ap.fill('input[name=password]', 'abcdefgh1')
  await ap.click('button[type=submit]')
  await ap.waitForTimeout(800)
  const errTxt = await bodyText(ap)
  check(
    'signup shows field-level password errors',
    /uppercase|special/i.test(errTxt),
    errTxt.slice(0, 200),
  )
  await ap.fill('input[name=password]', 'Valid#Pass1')
  await ap.click('button[type=submit]')
  await ap.waitForURL(/portal/, { timeout: 15000 }).catch(() => {})
  check(
    'signup creates customer + linked record',
    psql(
      `select count(*) from users u join customers c on c.user_id=u.id where lower(u.email)='${semail}' and u.role='customer'`,
    ) === '1',
  )
  // case-insensitive duplicate
  const ctx2 = await browser.newContext()
  const p2 = await ctx2.newPage()
  await p2.goto(BASE + '/signup', { waitUntil: 'networkidle' })
  await p2.fill('input[name=name]', 'Dup')
  await p2.fill('input[name=email]', semail.toUpperCase())
  await p2.fill('input[name=password]', 'Valid#Pass1')
  await p2.click('button[type=submit]')
  await p2.waitForTimeout(1200)
  check(
    'duplicate email (different case) rejected',
    /already|exists|registered/i.test(await bodyText(p2)),
    (await bodyText(p2)).slice(0, 150),
  )
  // forgot / reset
  await p2.goto(BASE + '/forgot-password', { waitUntil: 'networkidle' })
  await p2.fill('input[name=email]', semail)
  await p2.click('button[type=submit]')
  await p2.waitForTimeout(1500)
  const m1 = await bodyText(p2)
  await p2.goto(BASE + '/forgot-password', { waitUntil: 'networkidle' })
  await p2.fill('input[name=email]', 'nobody@nowhere.example')
  await p2.click('button[type=submit]')
  await p2.waitForTimeout(1500)
  const m2 = await bodyText(p2)
  const norm = (t) =>
    t
      .split('\n')
      .filter((l) => /check|if an account|sent|link/i.test(l))
      .join('|')
  check(
    'forgot-password message identical for known/unknown email',
    norm(m1) === norm(m2) && norm(m1).length > 0,
    `${norm(m1)} vs ${norm(m2)}`,
  )
  const log = serverLog()
  const link = [...log.matchAll(/reset-password\?token=([A-Za-z0-9_-]+)/g)].pop()
  check('reset link printed (dev mail fallback)', !!link)
  check(
    'token stored hashed (64 hex), not raw',
    link &&
      psql("select count(*) from password_reset_tokens where token_hash ~ '^[0-9a-f]{64}$'") !==
        '0' &&
      psql(`select count(*) from password_reset_tokens where token_hash='${link[1]}'`) === '0',
  )
  if (link) {
    await p2.goto(`${BASE}/reset-password?token=${link[1]}`, { waitUntil: 'networkidle' })
    await p2.fill('input[name=password]', 'Reset#Pass9')
    const cp = p2.locator('input[name=confirmPassword]')
    if (await cp.count()) await cp.fill('Reset#Pass9')
    await p2.click('button[type=submit]')
    await p2.waitForTimeout(1500)
    check(
      'reset marks token used',
      psql('select count(*) from password_reset_tokens where used_at is not null') !== '0',
    )
    await p2.goto(`${BASE}/reset-password?token=${link[1]}`, { waitUntil: 'networkidle' })
    await p2.fill('input[name=password]', 'Reset#Pass8')
    if (await cp.count()) await cp.fill('Reset#Pass8')
    await p2.click('button[type=submit]')
    await p2.waitForTimeout(1200)
    check(
      'reused token rejected',
      /invalid|expired|used/i.test(await bodyText(p2)),
      (await bodyText(p2)).slice(0, 150),
    )
  }

  // ---------- RESPONSIVE (375px) ----------
  const mctx = await browser.newContext({ viewport: { width: 375, height: 800 } })
  const mp = await mctx.newPage()
  await mp.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await mp.fill('input[name=email]', 'admin@brightloop.example')
  await mp.fill('input[name=password]', PW)
  await mp.click('button[type=submit]')
  await mp.waitForURL((u) => !u.pathname.startsWith('/login'))
  for (const p of [
    '/dashboard',
    '/subscriptions',
    '/subscriptions/new',
    '/invoices',
    '/payments',
    '/billing',
    '/customers',
    '/products',
    '/plans',
    '/quotation-templates',
    '/discounts',
    '/taxes',
    '/payment-terms',
    '/staff',
    `/invoices/${target}`,
    `/subscriptions/${subId}`,
  ]) {
    await mp.goto(BASE + p, { waitUntil: 'networkidle' })
    const over = await mp.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    check(`375px no horizontal page scroll ${p.slice(0, 30)}`, over <= 1, `overflow ${over}px`)
  }
  const burger = await mp.locator('button[aria-label="Open navigation menu"]').count()
  check('mobile has drawer menu button', burger > 0)

  // ---------- server-side role enforcement (raw) ----------
  const anonStatus = await (
    await anon.request.get(BASE + '/dashboard', { maxRedirects: 0 })
  ).status()
  check(
    'anonymous GET /dashboard is redirect, not content',
    anonStatus >= 300 && anonStatus < 400,
    String(anonStatus),
  )

  // ---------- ADDED CHECKS: reminders, quotations, history, plans, idempotency, limits ----------
  const health = await fetch(BASE + '/api/health')
  check('health endpoint is ok', health.status === 200 && (await health.json()).status === 'ok')

  // Forms must never fall back to GET, which would put a password in the address bar.
  const probe = await (await browser.newContext()).newPage()
  await probe.goto(BASE + '/login', { waitUntil: 'networkidle' })
  check(
    'login form posts, not gets',
    (await probe.locator('form').first().getAttribute('method')) === 'post',
  )
  check(
    'required fields are marked',
    (await probe.locator('label:has-text("Email") span').count()) > 0,
  )

  // Login rate limit: five wrong tries on one email, then it is refused for a while.
  const limited = `ratelimit${Date.now()}@example.com`
  for (let i = 0; i < 5; i++) {
    await probe.fill('input[name=email]', limited)
    await probe.fill('input[name=password]', 'Wrong#Pass1')
    await probe.click('button[type=submit]')
    await probe.waitForTimeout(500)
  }
  await probe.fill('input[name=email]', limited)
  await probe.fill('input[name=password]', 'Wrong#Pass1')
  await probe.click('button[type=submit]')
  await probe.waitForTimeout(800)
  check(
    'login is rate limited after repeated failures',
    /Too many attempts/i.test(await bodyText(probe)),
    (await bodyText(probe)).slice(0, 200),
  )

  // Reminders on an overdue invoice.
  const overdueId = psql(
    "select id from invoices where status='confirmed' and total>amount_paid and due_date < (now() at time zone 'Asia/Kolkata')::date order by number limit 1",
  )
  await a.goto(`${BASE}/invoices/${overdueId}`, { waitUntil: 'networkidle' })
  await a.click('button:has-text("Send reminder")')
  await a.waitForTimeout(1500)
  check(
    'reminder is recorded as delivered',
    psql(`select count(*) from payment_reminders where invoice_id='${overdueId}' and delivered`) ===
      '1',
  )
  check('reminder history shows on the invoice', /Reminders/.test(await bodyText(a)))
  await a.click('button:has-text("Send reminder")')
  await a.waitForTimeout(1200)
  check(
    'second reminder the same day is refused',
    psql(`select count(*) from payment_reminders where invoice_id='${overdueId}' and delivered`) ===
      '1',
  )
  await a.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  check('dashboard overdue table shows reminders sent', /reminders sent/i.test(await bodyText(a)))
  const notOverdue = psql("select id from invoices where status='paid' limit 1")
  await a.goto(`${BASE}/invoices/${notOverdue}`, { waitUntil: 'networkidle' })
  check(
    'no reminder button on a paid invoice',
    (await a.locator('button:visible:has-text("Send reminder")').count()) === 0,
  )

  // Quotation email, print, history.
  const quote = psql(
    "select id from subscriptions where status='quotation' and quotation_valid_until >= (now() at time zone 'Asia/Kolkata')::date order by number limit 1",
  )
  await a.goto(`${BASE}/subscriptions/${quote}`, { waitUntil: 'networkidle' })
  await a.click('button:has-text("Email quotation")')
  await a.waitForTimeout(1500)
  check(
    'quotation email stamps quotation_sent_at',
    psql(`select quotation_sent_at is not null from subscriptions where id='${quote}'`) === 't',
  )
  await a.goto(`${BASE}/print/quotation/${quote}`, { waitUntil: 'networkidle' })
  check(
    'quotation print page loads',
    /Quotation/.test(await bodyText(a)) && /SUB-/.test(await bodyText(a)),
  )
  await a.goto(`${BASE}/subscriptions/${quote}`, { waitUntil: 'networkidle' })
  check(
    'subscription detail shows history',
    /History/.test(await bodyText(a)) && /Quotation emailed/i.test(await bodyText(a)),
  )

  // A double click records one payment.
  const dbl = psql(
    "select id from invoices where status='confirmed' and amount_paid=0 and total>1000 order by number desc limit 1",
  )
  await a.goto(`${BASE}/invoices/${dbl}`, { waitUntil: 'networkidle' })
  await a.selectOption('select[name=method]', 'cash')
  await a.fill('input[name=amount]', '5.00')
  await a.dblclick('button:has-text("Record payment")')
  await a.waitForTimeout(2000)
  check(
    'double-clicking Record payment records it once',
    psql(`select count(*) from payments where invoice_id='${dbl}'`) === '1',
  )

  // Dashboard invoice-status filter.
  await a.goto(BASE + '/dashboard?invoiceStatus=overdue', { waitUntil: 'networkidle' })
  const dashText = await bodyText(a)
  check(
    'dashboard invoice status filter works',
    /Invoices/.test(dashText) && /Overdue/.test(dashText),
  )

  // Customer plans page.
  const plansPage = await login(browser, 'asha@customer.example')
  await plansPage.page.goto(BASE + '/portal/plans', { waitUntil: 'networkidle' })
  const plansText = await bodyText(plansPage.page)
  check('customer sees available plans', /Monthly standard/.test(plansText))
  check('customer does not see an ended plan', !/Launch offer/.test(plansText))

  // ---------- ADDED CHECKS: the redesigned screens ----------
  const landing = await (await browser.newContext()).newPage()
  await landing.goto(BASE + '/', { waitUntil: 'networkidle' })
  const landingText = await bodyText(landing)
  check(
    'landing page is public',
    /Brightloop/.test(landingText) && /Log in/.test(landingText) && /Features/.test(landingText),
    landingText.slice(0, 120),
  )

  // The demo accounts on the sign-in page fill the form, and signing in lands on the right home.
  const demo = await (await browser.newContext()).newPage()
  await demo.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await demo.locator('li:has-text("Customer") button:has-text("Use")').click()
  check(
    'demo account button fills the form',
    (await demo.inputValue('input[name=email]')) === 'asha@customer.example',
  )
  await demo.click('button[type=submit]')
  await demo.waitForURL(/\/portal/, { timeout: 15000 })
  await demo.waitForSelector('text=Quick actions')
  const home = await bodyText(demo)
  check(
    'customer home shows the overview cards',
    /Active subscriptions/.test(home) &&
      /Outstanding amount/.test(home) &&
      /Recent invoices/.test(home),
    home.slice(0, 200),
  )
  check(
    'customer home shows payments chart and current subscription',
    /Payments received/.test(home) && /current subscription|no active subscription/i.test(home),
  )

  // Subscription cards, tabs and detail with timeline.
  await demo.goto(BASE + '/portal/subscriptions', { waitUntil: 'networkidle' })
  check('subscription tabs show counts', (await demo.locator('button[aria-pressed]').count()) >= 5)
  await demo.click('button[aria-pressed]:has-text("Active")')
  await demo.waitForSelector('button[aria-pressed=true]:has-text("Active")')
  await demo.waitForLoadState('networkidle')
  await demo.waitForTimeout(1200)
  check(
    'Active tab narrows the list',
    (await demo.locator('a[aria-label*=", active. "]').count()) >= 1 &&
      (await demo.locator('a[aria-label*=", confirmed. "]').count()) === 0,
  )
  await demo.locator('a[aria-label*="View details"]').first().click()
  await demo.waitForURL(/\/portal\/subscriptions\/[0-9a-f-]{36}/)
  await demo.waitForSelector('text=Subscription information')
  const detail = await bodyText(demo)
  check(
    'subscription detail shows information, pricing and timeline',
    /subscription information/i.test(detail) && /pricing/i.test(detail) && /timeline/i.test(detail),
    detail.slice(0, 150),
  )

  // Customer payment history and invoice paper.
  await demo.goto(BASE + '/portal/payments', { waitUntil: 'networkidle' })
  check('customer payment history lists their payments', /Total paid/.test(await bodyText(demo)))
  await demo.goto(BASE + '/portal/invoices', { waitUntil: 'networkidle' })
  await demo.locator('tbody a').first().click()
  await demo.waitForURL(/\/portal\/invoices\/[0-9a-f-]{36}/)
  await demo.waitForSelector('text=Payment status')
  const paper = await bodyText(demo)
  check(
    'invoice detail shows payment status and billed to',
    /payment status/i.test(paper) && /billed to/i.test(paper),
    paper.slice(0, 150),
  )

  // Customer pages at phone width.
  const phone = await browser.newContext({ viewport: { width: 375, height: 800 } })
  const pp = await phone.newPage()
  await pp.goto(BASE + '/login', { waitUntil: 'networkidle' })
  await pp.fill('input[name=email]', 'asha@customer.example')
  await pp.fill('input[name=password]', PW)
  await pp.click('button[type=submit]')
  await pp.waitForURL(/\/portal/)
  for (const path of [
    '/portal',
    '/portal/subscriptions',
    '/portal/invoices',
    '/portal/payments',
    '/portal/plans',
    '/portal/profile',
  ]) {
    await pp.goto(BASE + path, { waitUntil: 'networkidle' })
    const over = await pp.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    check(`375px customer page ${path} has no sideways scroll`, over <= 1, `overflow ${over}px`)
  }
  for (const path of ['/', '/login']) {
    await pp.context().clearCookies()
    await pp.goto(BASE + path, { waitUntil: 'networkidle' })
    const over = await pp.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    check(`375px public page ${path} has no sideways scroll`, over <= 1, `overflow ${over}px`)
  }

  // Dashboard in the new design.
  await a.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  const board = await bodyText(a)
  check('dashboard shows the monthly revenue chart', /Revenue by month/.test(board))

  const errs = [...admin.errors, ...staff.errors, ...cust.errors]
  check('no uncaught page errors in browser', errs.length === 0, errs.slice(0, 3).join(' | '))
  await browser.close()
  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} passed`)
  if (failed.length) console.log('FAILED:\n' + failed.map((f) => ' - ' + f.name).join('\n'))
})().catch((e) => {
  console.error('SCRIPT ERROR', e)
  process.exit(1)
})
