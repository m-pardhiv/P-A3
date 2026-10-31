import bcrypt from 'bcryptjs'

const BCRYPT_COST = 12

// Compared when the email is unknown, so a miss takes as long as a wrong password.
const NO_USER_HASH = bcrypt.hashSync('no-such-user', BCRYPT_COST)

export const hashPassword = (password: string) => bcrypt.hash(password, BCRYPT_COST)

export const verifyPassword = (password: string, hash: string | undefined) =>
  bcrypt.compare(password, hash ?? NO_USER_HASH)
