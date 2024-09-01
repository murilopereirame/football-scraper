import { generateForTeams } from "./generator";
import fs from "fs";
import express from "express";
import { ensurePublicDirExists, log } from "./utils";
import cron from "node-cron";
import { Config } from "./interfaces";
import path from "path";

const app = express();
const config: Config = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "config.json")).toString()
);

ensurePublicDirExists();

app.use(express.static(path.resolve(__dirname, "public")));

app.listen(config.port, async () => {
  log(`Server running at port ${config.port}`);
  if (config.runAtStartup) {
    log("Running at startup...");
    await generateForTeams(config.teams, config.timeZone);
  }

  cron.schedule(config.cron, async () => {
    log("Generating calendars...");
    await generateForTeams(config.teams, config.timeZone);
  });
});
