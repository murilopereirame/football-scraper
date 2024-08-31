const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const { v5: uuidv5 } = require('uuid');
const { DateTime } = require('luxon');
const fs = require('fs');

// URL of the page to scrape
const resultsUrl = "https://www.flashscore.com/team/santos/n3QdnjFB/results/";
const fixturesUrl = "https://www.flashscore.com/team/santos/n3QdnjFB/fixtures/";
const CALENDAR_NAMESPACE = 'd2178b5e-156c-4aa6-bfa4-8dc501cf330c';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(() => resolve(true), ms))
}

async function getDynamicSoup(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  await sleep(5000)
  await loadGames(page);
  const content = await page.content();
  const $ = cheerio.load(content);
  await browser.close();
  return $;
}

async function loadGames(page) {
  let events = await page.$$('.event__time');

  if (events.length === 0) {
    return;
  }

  let event = (await events[events.length - 1].evaluate(node => node.innerText)).trim();
  while (await page.$('.event__more') && event.length === 12) {
    await page.click('.event__more');
    console.log("Loading more");
    await sleep(5000);
    events = await page.$$('.event__time');
    event = (await events[events.length - 1].evaluate(node => node.innerText)).trim();
  }
}

async function loadResults() {
  const $ = await getDynamicSoup(resultsUrl);
  const resultsSection = $('.sportName.soccer');
  return parseMatches(resultsSection, true);
}

async function loadFixtures() {
  const $ = await getDynamicSoup(fixturesUrl);
  const fixturesSection = $('.sportName.soccer');
  return parseMatches(fixturesSection, false);
}

function getChampionship(tree, id) {
  const headerComponent = tree(`#${id}`).prevAll().toArray().find((elem) => elem.attribs['class'].includes('wclLeagueHeader'))
  return tree(headerComponent).find('.event__titleBox a').text().trim()
}

function parseMatches(tree, includeResult) {
  const matchesList = [];
  const pageTree = cheerio.load(tree.html())
  const matches = tree.find('.event__match').toArray();
  for (const fixture of matches) {
    const $fixture = cheerio.load(fixture);
    const id = $fixture.root().children().first().attr("id").trim();
    const championship = getChampionship(pageTree, id);
    const homeElem = $fixture('.event__homeParticipant');
    let homeTeam = homeElem.find('span').text().trim() || homeElem.find('strong').text().trim();
    if (!homeTeam) continue;

    const awayElem = $fixture('.event__awayParticipant');
    let awayTeam = awayElem.find('span').text().trim() || awayElem.find('strong').text().trim();
    if (!awayTeam) continue;

    let date = $fixture('.event__time').text().trim().replace("Pen", "");
    if (date.length !== 12) {
      continue;
    }

    let dateObj = DateTime.fromFormat(date, 'dd.MM. HH:mm', { zone: 'Europe/Berlin' }).set({ year: DateTime.now().year });
    let utcDatetime = dateObj.toUTC();
    let formattedDate = utcDatetime.toFormat("yyyyLLdd'T'HHmmss'Z'");
    let newDateObj = utcDatetime.plus({ hours: 1, minutes: 45 });

    let description = "";
    if (includeResult) {
      const stageElem = $fixture('.event__stage');
      if (stageElem && stageElem.text().trim() === "Pen") {
        const homeScore = $fixture('.event__part--home').text().trim();
        const awayScore = $fixture('.event__part--away').text().trim();
        description = `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
      } else {
        const homeScore = $fixture('.event__score--home').text().trim();
        const awayScore = $fixture('.event__score--away').text().trim();
        description = `${homeTeam} ${homeScore} - ${awayScore} ${awayTeam}`;
      }
    }

    matchesList.push({
      championship,
      homeTeam,
      awayTeam,
      start: formattedDate,
      end: newDateObj.toFormat("yyyyLLdd'T'HHmmss'Z'"),
      description
    });
  }

  return matchesList;
}

const generateCalendar = async () => {
  const header = [
    "BEGIN:VCALENDAR\n",
    "PRODID:-//Murilo Pereira//EN\n",
    "VERSION:2.0\n",
    "CALSCALE:GREGORIAN\n",
    "METHOD:PUBLISH\n"
  ];

  const results = await loadResults();
  const fixtures = await loadFixtures();

  const filePath = 'santos.ics';
  const file = fs.createWriteStream(filePath);

  file.on('error', (err) => {
    console.error('Error writing to file', err);
  });

  file.write(header.join(''));

  for (const result of results) {
    await writeMatch(result, file)
  }

  for (const fixture of fixtures) {
    await writeMatch(fixture, file)
  }

  file.write("END:VCALENDAR");
  file.end();
}

const writeMatch = async (match, file) => {
  const eventHash = await generateSHA256Hash(`${match.homeTeam}-${match.awayTeam}-${match.start}-${match.end}-${match, match.description.replace(" ", "")}`)
  const uuid = uuidv5(eventHash, CALENDAR_NAMESPACE)
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
  ]

  file.write(lines.join(''));
}

async function generateSHA256Hash(message) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

generateCalendar()