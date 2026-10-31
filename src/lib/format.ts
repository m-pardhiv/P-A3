const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })

export const formatMoney = (paise: number) => inr.format(paise / 100)
