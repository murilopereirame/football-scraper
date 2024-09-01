import cheerio from "cheerio";
interface Match {
  championship: string;
  homeTeam: string;
  awayTeam: string;
  start: string;
  end: string;
  description: string;
}

interface Source {
  team: Team;
  timeZone: string;
}

interface Team {
  name: string;
  resultsUrl: string;
  fixturesUrl: string;
}

interface Config {
  teams: Team[];
  timeZone: string;
  runAtStartup: boolean;
  port: number;
  cron: string;
}

interface ParsedElement extends cheerio.TextElement {
  attribs: {
    [name: string]: string;
  };
}

export type { Match, Source, Team, Config, ParsedElement };
