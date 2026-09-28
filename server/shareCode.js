import { randomInt } from 'node:crypto'

// Ambiguous characters left out: the code is read aloud and typed by hand
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 6

export const SHARE_CODE_PATTERN = /^[A-Z2-9]{6}$/

// A random code, uniqueness is checked by the caller
export function randomShareCode() {
  let code = ''

  while (code.length < CODE_LENGTH) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]
  }

  return code
}
