import type { WriteStream } from "fs";
import { v5 as uuidv5 } from "uuid";
import fs from "fs";
import { generateSHA256Hash, log } from "./utils";
import { loadMatches } from "./parser";
import { Match, Source, Team } from "./interfaces";
import path from "path";

const CALENDAR_NAMESPACE = "d2178b5e-156c-4aa6-bfa4-8dc501cf330c";

const generateForTeams = async (teams: Team[], timeZone: string) => {
  for (const team of teams) {
    log(`Generating calendar for ${team.name}`);
    await generateCalendar({
      team,
      timeZone,
    });
    log(`Generated calendar for ${team.name}`);
  }
};

const generateCalendar = async (data: Source) => {
  const header = [
    "BEGIN:VCALENDAR\n",
    `X-WR-CALNAME: ${data.team}\n`,
    "PRODID:-//Murilo Pereira//PT\n",
    "VERSION:2.0\n",
    "CALSCALE:GREGORIAN\n",
    "METHOD:PUBLISH\n",
  ];

  let matches = null;
  try {
    matches = [
      ...(await loadMatches(data.team.resultsUrl, true, data.timeZone)),
      ...(await loadMatches(data.team.fixturesUrl, false, data.timeZone)),
    ];
  } catch (e) {
    log(`Failed to load matches - ${e}`);
  }

  if (!matches) {
    return;
  }

  const filePath = `${data.team.name
    .normalize("NFD") // Normalize to decompose combined characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritical marks
    .replace(/\s+/g, "-") // Replace spaces by -
    .replace(/[^a-zA-Z0-9-]/g, "") // Remove anything that isn't a letter, number or dash
    .toLowerCase()}.ics`;
  const file = fs.createWriteStream(
    path.resolve(__dirname, `public/${filePath}`)
  );

  file.on("error", (err: any) => {
    console.error("Error writing to file", err);
  });

  file.write(header.join(""));

  for (const match of matches) {
    await writeMatch(match, file);
  }

  file.write("END:VCALENDAR");
  file.end();
};

const writeMatch = async (match: Match, file: WriteStream) => {
  const eventHash = await generateSHA256Hash(
    `${match.homeTeam}-${match.awayTeam}-${match.start}-${
      match.end
    }-${match.description.replace(" ", "")}`
  );

  const uuid = uuidv5(eventHash, CALENDAR_NAMESPACE);

  const lines = [
    `BEGIN:VEVENT\n`,
    `DTSTART:${match.start}\n`,
    `DTEND:${match.end}\n`,
    `DTSTAMP:${match.start}\n`,
    `UID: ${uuid}\n`,
    `SEQUENCE:0\n`,
    `SUMMARY:${match.championship} ${match.homeTeam} - ${match.awayTeam}\n`,
    `DESCRIPTION:${match.description}\n`,
    `END:VEVENT\n`,
  ];

  file.write(lines.join(""));
};

export { generateForTeams };
