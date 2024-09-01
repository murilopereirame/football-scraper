import fs from "fs";
import { DateTime } from "luxon";
import path from "path";

async function generateSHA256Hash(message: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(() => resolve(true), ms));
}

const ensurePublicDirExists = () => {
  if (!fs.existsSync(path.resolve(__dirname, "public"))) {
    log("Creating public dir...");
    return fs.mkdirSync(path.resolve(__dirname, "public"));
  }

  log("Public dir exists");
};

const log = (message: string) => {
  const now = DateTime.now().toFormat("dd.LL.yyyy HH:mm:ss");
  console.log(`[${now}] ${message}`);
};

export { generateSHA256Hash, sleep, ensurePublicDirExists, log };
