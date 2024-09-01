import puppeteer, { Page } from "puppeteer";
import { sleep } from "./utils";
import * as cheerio from "cheerio";
import { DateTime } from "luxon";

function getChampionship(tree: cheerio.Root, id: string) {
  const championship = tree(`#${id}`)
    .prevAll()
    .find("wclLeagueHeader")
    .find(".event__titleBox a")
    .text()
    .trim();

  return championship;
}

async function getDynamicSoup(url: string) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await sleep(5000);
  await loadGames(page);
  const content = await page.content();
  const $ = cheerio.load(content);
  await browser.close();
  return $;
}

async function loadGames(page: Page) {
  let events = await page.$$(".event__time");

  if (events.length === 0) {
    return;
  }

  let event =
    (
      await events[events.length - 1].evaluate((node) => node.textContent)
    )?.trim() ?? "";
  while ((await page.$(".event__more")) && event.length === 12) {
    await page.click(".event__more");
    console.log("Loading more");
    await sleep(5000);
    events = await page.$$(".event__time");
    event =
      (
        await events[events.length - 1].evaluate((node) => node.textContent)
      )?.trim() ?? "";
  }
}

async function loadResults(url: string, timeZone: string = "Europe/Berlin") {
  const $ = await getDynamicSoup(url);
  const resultsSection = $(".sportName.soccer");
  return parseMatches(resultsSection, true, timeZone);
}

async function loadFixtures(url: string, timeZone: string = "Europe/Berlin") {
  const $ = await getDynamicSoup(url);
  const fixturesSection = $(".sportName.soccer");
  return parseMatches(fixturesSection, false, timeZone);
}

function parseMatches(
  tree: cheerio.Cheerio,
  includeResult: boolean,
  timeZone: string
) {
  const matchesList = [];
  const pageTree = cheerio.load(tree.html() ?? "");
  const matches = tree.find(".event__match").toArray();
  for (const fixture of matches) {
    const $fixture = cheerio.load(fixture);
    const id = $fixture.root().children().first().attr("id")?.trim() ?? "";
    const championship = getChampionship(pageTree, id);
    const homeElem = $fixture(".event__homeParticipant");
    let homeTeam =
      homeElem.find("span").text().trim() ||
      homeElem.find("strong").text().trim();
    if (!homeTeam) continue;

    const awayElem = $fixture(".event__awayParticipant");
    let awayTeam =
      awayElem.find("span").text().trim() ||
      awayElem.find("strong").text().trim();
    if (!awayTeam) continue;

    let date = $fixture(".event__time").text().trim().replace("Pen", "");
    if (date.length !== 12) {
      continue;
    }

    let dateObj = DateTime.fromFormat(date, "dd.MM. HH:mm", {
      zone: timeZone,
    }).set({ year: DateTime.now().year });
    let utcDatetime = dateObj.toUTC();
    let formattedDate = utcDatetime.toFormat("yyyyLLdd'T'HHmmss'Z'");
    let newDateObj = utcDatetime.plus({ hours: 1, minutes: 45 });

    let description = "";
    if (includeResult) {
      const stageElem = $fixture(".event__stage");
      if (stageElem && stageElem.text().trim() === "Pen") {
        const homeScore = $fixture(".event__part--home").text().trim();
        const awayScore = $fixture(".event__part--away").text().trim();
        description = `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
      } else {
        const homeScore = $fixture(".event__score--home").text().trim();
        const awayScore = $fixture(".event__score--away").text().trim();
        description = `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
      }
    }

    matchesList.push({
      championship,
      homeTeam,
      awayTeam,
      start: formattedDate,
      end: newDateObj.toFormat("yyyyLLdd'T'HHmmss'Z'"),
      description,
    });
  }

  return matchesList;
}

export { loadResults, loadFixtures };
