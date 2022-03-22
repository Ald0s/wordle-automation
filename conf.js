
/*
Change the number of letters.
*/
const NUMBER_OF_LETTERS = 5;

/*
If true, we will make sure the game is on 'daily mode' before continuing.
*/
const PLAY_DAILY_MODE = false;

/*
Number of games to play before finishing the session and reporting results.
*/
const NUM_GAMES_TO_PLAY = 20;

/*
Alphabet to use for the game.
*/
const ASCII = Array.from("abcdefghijklmnopqrstuvwxyz");

/*
Ad providers - add a block if you want.
*/
const BLOCKED_RESOURCE = [
    "quantserve",
    "adzerk",
    "doubleclick",
    "adition",
    "exelator",
    "sharethrough",
    "twitter",
    "google-analytics",
    "fontawesome",
    "facebook",
    "analytics",
    "optimizely",
    "clicktale",
    "mixpanel",
    "zedo",
    "clicksor",
    "tiqcdn",
    "googlesyndication",
    "pub.network",
    "indexww",
    "amazon-adsystem",
    "3lift",
    "openx",
    "bidswitch",
    "ssp.yahoo",
    "criteo",
    "lijit",
    "casalemedia",
    "yieldmo",
    "pubmatic",
    "sharethrough",
    "rubiconproject",
    "adlightning",
    "4dex.io",
];

exports.NUMBER_OF_LETTERS = NUMBER_OF_LETTERS;
exports.PLAY_DAILY_MODE = PLAY_DAILY_MODE;
exports.NUM_GAMES_TO_PLAY = NUM_GAMES_TO_PLAY;

exports.BLOCKED_RESOURCE = BLOCKED_RESOURCE;
exports.ALL_ASCII = ASCII;
