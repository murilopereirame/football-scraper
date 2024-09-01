# Football Scraper

Football Scraper is a project designed to scrape the website flashscore.com to gather results and fixtures for a given football team. This tool is useful for football enthusiasts, analysts, and developers who want to automate the collection of match data.

## Features

- Scrapes results and fixtures for specified teams from flashscore.com.
- Configurable to run at startup or on a scheduled basis using cron.
- Serves the scraped data through an Express server.

## Configuration
The configuration for the scraper is done through a JSON file. Below is an example of the config file:

```json
{
  "teams": [
    {
      "name": "",
      "resultsUrl": "https://www.flashscore.com/team/***/***/results/",
      "fixturesUrl": "https://www.flashscore.com/team/***/***/fixtures/"
    }
  ],
  "timeZone": "utc",
  "runAtStartup": true,
  "port": 9000,
  "cron": "0 0 * * *"
}
```

## Configuration Parameters

- **teams**: An array of teams to be scraped.
  - **name**: The name of the team. This will also be used as the file name.
  - **resultsUrl**: The URL on flashscore.com for the team’s latest results.
  - **fixturesUrl**: The URL on flashscore.com for the team’s upcoming fixtures.
- **timeZone**: The base timezone for the calendar.
- **runAtStartup**: Boolean indicating if the script should run when started or only using cron.
- **port**: The port on which the Express server will serve the files.
- **cron**: The crontab expression to schedule the scraping job.

## Installation

1. Clone the repository:

```bash
git clone https://github.com/murilopereirame/football-scraper.git
```

2. Navigate to the project directory:

```bash
cd football-scraper
```

3. Install the dependencies:

```bash
npm install
```

## Usage

1. Update the config.json file with your desired teams and settings.  
2. Start the scraper:

```bash
npm run run
```

The data will be served on the specified port (default is 9000).

## Scheduling

To run the scraper on a schedule, ensure the ```cron``` parameter is set in the ```config.json``` file. The default setting runs the scraper daily at midnight.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request with your changes.

## License

This project is licensed under the GPLv3 License. See the LICENSE file for details.
