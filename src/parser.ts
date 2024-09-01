import puppeteer, { Page } from "puppeteer";
import { sleep } from "./utils";
import * as cheerio from "cheerio";
import { DateTime } from "luxon";
import { ParsedElement } from "./interfaces";

const getChampionship = (tree: cheerio.Root, id: string) => {
  const headerComponent = tree(`#${id}`)
    .prevAll()
    .toArray()
    .find((elem) =>
      (elem as ParsedElement).attribs["class"].includes("wclLeagueHeader")
    );
  return tree(headerComponent).find(".event__titleBox a").text().trim();
};

const loadPageSource = async (url: string) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto(url);
  await sleep(5000);
  await loadGames(page);

  const content = await page.content();
  const loadedPage = cheerio.load(content);

  await browser.close();
  return loadedPage;
};

const loadGames = async (page: Page) => {
  let events = await page.$$(".event__time");

  if (events.length === 0) {
    return;
  }

  let event =
    (
      await events[events.length - 1].evaluate((node) => node.textContent)
    )?.trim() ?? "";

  // Check if the Load More events button still dislayed and
  // if it's loading events from past year (aka Past Season)
  while ((await page.$(".event__more")) && event.length === 12) {
    await page.click(".event__more");

    await sleep(5000);

    // Select all events in the page
    events = await page.$$(".event__time");

    event =
      (
        await events[events.length - 1].evaluate((node) => node.textContent)
      )?.trim() ?? "";
  }
};

const loadMatches = async (
  url: string,
  includeResult: boolean,
  timeZone: string = "Europe/Berlin"
) => {
  const $ = await loadPageSource(url);
  const resultsSection = $(".sportName.soccer");
  return parseMatches(resultsSection, includeResult, timeZone);
};

const buildDescription = (
  match: cheerio.Root,
  homeTeam: string,
  awayTeam: string
) => {
  const stageElem = match(".event__stage");
  const selector =
    stageElem && stageElem.text().trim() === "Pen"
      ? ".event__part"
      : ".event__score";

  const homeScore = match(`${selector}--home`).text().trim();
  const awayScore = match(`${selector}--away`).text().trim();
  return `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
};

const buildDates = (date: string, timeZone: string) => {
  let dateObj = DateTime.fromFormat(date, "dd.MM. HH:mm", {
    zone: timeZone,
  }).set({ year: DateTime.now().year });
  let utcDatetime = dateObj.toUTC();
  let formattedDate = utcDatetime.toFormat("yyyyLLdd'T'HHmmss'Z'");
  let newDateObj = utcDatetime.plus({ hours: 1, minutes: 45 });

  return {
    start: formattedDate,
    end: newDateObj.toFormat("yyyyLLdd'T'HHmmss'Z'"),
  };
};

const parseMatches = (
  tree: cheerio.Cheerio,
  includeResult: boolean,
  timeZone: string
) => {
  const matchesList = [];

  // When we use find, part of the DOM is removed
  // so we keep a copy of the original DOM to search for the event name
  const pageTree = cheerio.load(tree.html() ?? "");

  const matches = tree.find(".event__match").toArray();
  for (const match of matches) {
    const matchDOM = cheerio.load(match);

    const matchId = matchDOM.root().children().first().attr("id")?.trim() ?? "";
    const championship = getChampionship(pageTree, matchId);

    const homeElem = matchDOM(".event__homeParticipant");
    let homeTeam =
      homeElem.find("span").text().trim() ||
      homeElem.find("strong").text().trim();
    if (!homeTeam) continue;

    const awayElem = matchDOM(".event__awayParticipant");
    let awayTeam =
      awayElem.find("span").text().trim() ||
      awayElem.find("strong").text().trim();
    if (!awayTeam) continue;

    let date = matchDOM(".event__time").text().trim().replace("Pen", "");
    if (date.length !== 12) {
      continue;
    }

    let description = includeResult
      ? buildDescription(matchDOM, homeTeam, awayTeam)
      : "";

    matchesList.push({
      championship,
      homeTeam,
      awayTeam,
      ...buildDates(date, timeZone),
      description,
    });
  }

  return matchesList;
};

export { loadMatches };
