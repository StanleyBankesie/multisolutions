import { ensureAuthTables } from "../server/services/token.service.js";

async function test() {
  try {
    await ensureAuthTables();
    console.log("ensureAuthTables succeeded");
  } catch (err) {
    console.error("ensureAuthTables failed:", err);
  }
  process.exit();
}

test();
