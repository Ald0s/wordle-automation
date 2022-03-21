// sudo sysctl -w kernel.unprivileged_userns_clone=1

const wordle = require("./wordle");
const conf = require("./conf");
const report = require("./report");

const proxyChain = require('proxy-chain');
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
puppeteer.use(StealthPlugin());

/*
Attempt to locate private module - this contains proxies and ungoogled Chromium.
*/
var privateConf = null;
var USE_PROXY = false;
var PROXIES = [];

var USE_UNGOOGLED_CHROMIUM = false;
var UNGOOGLED_CHROMIUM_EXEC_PATH = null;

try {
    require.resolve("./private/conf");
    privateConf = require("./private/conf");
    USE_PROXY = USE_PROXY && true;
    PROXIES = privateConf.PROXIES;

    USE_UNGOOGLED_CHROMIUM = true;
    UNGOOGLED_CHROMIUM_EXEC_PATH = privateConf.UNGOOGLED_CHROMIUM_PATH;
} catch(e) {
    privateConf = null;
    USE_PROXY = false;
    USE_UNGOOGLED_CHROMIUM = false;
}

(async () => {
    let puppArgs = [];

    // If we want to use a proxy, grab a random proxy URL from the array and create an anonymised proxy.
    if(USE_PROXY && PROXIES.length > 0) {
        newProxyUrl = await proxyChain.anonymizeProxy(PROXIES[ Math.floor(Math.random() * PROXIES.length) ]);
        // Give to args.
        puppArgs.push(`--proxy-server=${newProxyUrl}`);
    }

    let puppLaunchArgs = {
        headless: false,
        args: puppArgs
    };

    if(USE_UNGOOGLED_CHROMIUM && UNGOOGLED_CHROMIUM_EXEC_PATH !== null) {
        puppLaunchArgs.executablePath = UNGOOGLED_CHROMIUM_EXEC_PATH;
        puppLaunchArgs.ignoreHTTPSErrors = true;
        puppLaunchArgs.ignoreDefaultArgs = [ "--enable-automation" ];
    }

    // Create new browser.
    const browser = await puppeteer.launch(puppLaunchArgs);
    const page = await browser.newPage();
    // Navigate to https://wordlegame.org/
    await page.goto("https://wordlegame.org/");
    // Now, we can execute the game.
    let masterGameResult = await wordle.playWordle(page);
    // Print some statistics.
    console.log(`Session finished. Results:\n\tGames played: ${masterGameResult.numGames}\n\tSuccess percentage: ${masterGameResult.successPercentage}%`);
    await report.printResultsToGrid(masterGameResult);
    // Close browser when complete.
    await browser.close();
})();
