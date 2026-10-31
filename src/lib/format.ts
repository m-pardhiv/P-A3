const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const dateFormat = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeZone: 'UTC' })

export const formatMoney = (paise: number) => inr.format(paise / 100)

/** Paise as the plain rupee text a money input expects, such as 1200.50. */
export const paiseToInput = (paise: number) => (paise / 100).toFixed(2)

/** Business dates are calendar days, so they format in UTC and never shift by a time zone. */
export const formatDate = (date: string | null | undefined) =>
  date ? dateFormat.format(new Date(`${date}T00:00:00Z`)) : 'None'

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
