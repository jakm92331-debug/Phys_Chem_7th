#!/usr/bin/env node
/**
 * Generates a scrypt hash for the teacher login.
 *
 * The initial teacher password (which the platform owner specified) is
 * deliberately NOT stored anywhere in this repository — not as plaintext,
 * not as a hash. The deployer generates the hash locally and stores it as
 * the `TEACHER_PASSWORD_HASH` secret of the deployment:
 *
 *   npm run hash:password
 *   # type the password when prompted (it is never echoed)
 *   # → scrypt$16384$8$1$…$…
 *
 * Then set TEACHER_PASSWORD_HASH to that string in the deployment
 * environment and start the server. Nothing about the password — or its
 * hash — ever enters git.
 */
import { createInterface } from 'node:readline'
import { hashPassword } from '../server/auth.js'

async function readPassword() {
  if (process.env.TEACHER_INITIAL_PASSWORD) {
    return process.env.TEACHER_INITIAL_PASSWORD
  }
  if (!process.stdin.isTTY) {
    console.error(
      'Error: no password provided. Set TEACHER_INITIAL_PASSWORD or run interactively.',
    )
    process.exit(2)
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolvePromise) => {
    // muted output: never echo the password back to the terminal
    rl.question('Teacher password: ', (answer) => {
      rl.close()
      resolvePromise(answer)
    })
  })
}

const password = await readPassword()
if (!password) {
  console.error('Error: empty password.')
  process.exit(2)
}
const hash = await hashPassword(password)
console.log(hash)
console.error(
  '\nStore this string as the TEACHER_PASSWORD_HASH secret of your deployment.\n' +
    'Never commit it, never paste it into chat, never put it in the repository.',
)
