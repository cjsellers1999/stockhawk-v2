import { hashAdminPassword } from "./admin-password.js";

const password = process.env.STOCKHAWK_ADMIN_PASSWORD;
if (password === undefined || password.length === 0) {
  throw new Error("Set STOCKHAWK_ADMIN_PASSWORD before generating its hash");
}

process.stdout.write(`${await hashAdminPassword(password)}\n`);
