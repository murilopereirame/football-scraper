interface Match {
  championship: string;
  homeTeam: string;
  awayTeam: string;
  start: string;
  end: string;
  description: string;
}

interface Source {
  team: string;
  resultsUrl: string;
  fixturesUrl: string;
}

export type { Match, Source };
