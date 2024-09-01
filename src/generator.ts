import type { WriteStream } from "fs";
import { v5 as uuidv5 } from "uuid";
import fs from "fs";
import { generateSHA256Hash } from "./utils";
import { loadFixtures, loadResults } from "./parser";
import { Match, Source } from "./interfaces";

const CALENDAR_NAMESPACE = "d2178b5e-156c-4aa6-bfa4-8dc501cf330c";

const generateCalendar = async (data: Source) => {
  const header = [
    "BEGIN:VCALENDAR\n",
    `X-WR-CALNAME: ${data.team}\n`,
    "PRODID:-//Murilo Pereira//PT\n",
    "VERSION:2.0\n",
    "CALSCALE:GREGORIAN\n",
    "METHOD:PUBLISH\n",
  ];

  const results = await loadResults(data.resultsUrl);
  const fixtures = await loadFixtures(data.fixturesUrl);

  const filePath = `${data.team.toLowerCase()}.ics`;
  const file = fs.createWriteStream(filePath);

  file.on("error", (err: any) => {
    console.error("Error writing to file", err);
  });

  file.write(header.join(""));

  for (const result of results) {
    await writeMatch(result, file);
  }

  for (const fixture of fixtures) {
    await writeMatch(fixture, file);
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

export { generateCalendar };
