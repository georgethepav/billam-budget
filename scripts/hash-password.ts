// Usage: npm run hash-password -- 'your-plaintext-password'
import bcrypt from "bcryptjs";

const plaintext = process.argv[2];

if (!plaintext) {
  console.error("Usage: npm run hash-password -- 'your-plaintext-password'");
  process.exit(1);
}

bcrypt.hash(plaintext, 12).then((hash) => {
  console.log("\nSet this as SITE_PASSWORD_HASH:\n");
  console.log(hash);
  console.log("");
});
