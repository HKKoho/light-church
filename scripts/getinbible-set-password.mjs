#!/usr/bin/env node
/**
 * Set a Get in Bible account's password (self-hosted, lightchurch-getinbible-db).
 *
 * Admins no longer share one password: give each admin their own with
 *   node scripts/getinbible-set-password.mjs "<name>"
 * Creates the account when the name is new. Options:
 *   --admin     make (or keep) the account an admin
 *   --student   make the account a student
 *
 * The password is typed hidden and sent to the database over stdin (never on
 * a command line); it is stored as a bcrypt hash by gib_admin_set_password().
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { stdin, stdout } from 'node:process';

const DB_CONTAINER = 'lightchurch-getinbible-db';

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--'))?.trim();
const role = args.includes('--admin') ? 'admin' : args.includes('--student') ? 'student' : null;

if (!name) {
  console.error('Usage: node scripts/getinbible-set-password.mjs "<name>" [--admin|--student]');
  process.exit(1);
}

/** Reads one line from the terminal without echoing it. */
function askHidden(prompt) {
  return new Promise((resolve) => {
    stdout.write(prompt);
    let value = '';
    stdin.setRawMode?.(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode?.(false);
          stdin.pause();
          stdin.off('data', onData);
          stdout.write('\n');
          resolve(value);
          return;
        }
        if (ch === '\u0003') process.exit(130); // Ctrl-C
        if (ch === '\u007f' || ch === '\b') value = value.slice(0, -1);
        else value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

const password = await askHidden(`New password for "${name}": `);
if ((await askHidden('Repeat it: ')) !== password) {
  console.error('Passwords do not match.');
  process.exit(1);
}
if (password.length < 8) {
  console.error('Use at least 8 characters.');
  process.exit(1);
}

// Dollar-quoting with a random tag: no escaping needed, no collision possible.
const tag = `p${randomBytes(8).toString('hex')}`;
const quote = (v) => `$${tag}$${v}$${tag}$`;
const sql = `select public.gib_admin_set_password(${quote(name)}, ${quote(password)}, ${
  role ? quote(role) : 'null'
});`;

const result = spawnSync(
  'docker',
  [
    'exec',
    '-i',
    DB_CONTAINER,
    'psql',
    '-U',
    'postgres',
    '-d',
    'postgres',
    '-At',
    '-v',
    'ON_ERROR_STOP=1',
  ],
  { input: sql, encoding: 'utf8' },
);
if (result.status !== 0) {
  console.error(`Failed: ${(result.stderr || result.error?.message || '').trim()}`);
  process.exit(1);
}
console.log(`✓ Password set for ${result.stdout.trim()}`);
