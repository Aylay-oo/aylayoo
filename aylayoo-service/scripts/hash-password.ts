// Usage (from apps/aylayoo/aylayoo-service):
//   bun scripts/hash-password.ts "your-strong-password"
import { hashPassword } from '../src/lib/password';

const password = process.argv[2];
if (!password) {
  console.error('Usage: bun scripts/hash-password.ts "your-password"');
  process.exit(1);
}
console.log(await hashPassword(password));
