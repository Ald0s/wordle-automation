/*
NOTE: This spec requires you have an http server running before testing.
Install http-server, then run server from /testhtml

    npm install http-server -g
    http-server ./testhtml
*/
const game = require("../game");
const puppeteer = require("puppeteer");

describe("game", () => {
    let browser = null;
    let page = null;
    const URL = 'http://127.0.0.1:8080/game.html';

    beforeEach(async () => {
        browser = await puppeteer.launch();
        page = await browser.newPage();
        await page.goto(URL);
    }, 90000);

    afterEach(async () => {
        await browser.close();
    });

    it("should read the correct number of rows", async () => {
        let numRows = await game.getRowCount(page);
        expect(numRows).toBe(6);
    });

    it("should read the correct number of letters", async () => {
        let numRows = await game.getLetterCount(page);
        expect(numRows).toBe(5);
    });

    it("should read the correct data from keyboard", async () => {
        let keyboardState = await game.readKeyboard(page);
        // From the state of the keyboard, get the following items; p, l, a, c, e, d
        // a & e should have positionIndicator of letter-elsewhere, the rest should have positionIndicator of letter-absent.
        // As a control, get k, j; these should both have positionIndicator blank ("")
        let absentLetters = keyboardState.absentLetters;
        expect(Object.keys(absentLetters)).toContain("p");
        expect(Object.keys(absentLetters)).toContain("l");
        expect(Object.keys(absentLetters)).toContain("c");
        expect(Object.keys(absentLetters)).toContain("d");

        let elsewhereLetters = keyboardState.elsewhereLetters;
        expect(Object.keys(elsewhereLetters)).toContain("a");

        let correctLetters = keyboardState.correctLetters;
        expect(Object.keys(correctLetters)).toContain("e");
    });

    it("should read a valid game state", async () => {
        let liveGameState = await game.readLiveGameState(page);
        // At the time of caching that HTML file, I had attempted P L A C E and nothing else.
        // Thus, we should have 6 rows.
        let latestRowStates = liveGameState.latestRowStates;
        expect(latestRowStates.length).toBe(6);
        // The first row, should be locked.
        expect(latestRowStates[0].rowState.isRowLocked).toBe(true);
        // Now confirm that each letter spells out 'place'.
        // Also, the number of items in first row letters should match the length of both attemptedWord and letterPositions arrays.
        // Also, 'p' should be absent, 'l' should be absent, 'a' should be elsewhere, 'c' should be absent and 'e' should be elsewhere.
        let attemptedWord = [ 'p', 'l', 'a', 'c', 'e' ];
        let letterPositions = [ 'letter-absent', 'letter-absent', 'letter-elsewhere', 'letter-absent', 'letter-elsewhere' ];
        let firstRowLetters = latestRowStates[0].latestLetterStates;
        expect(firstRowLetters.length).toBe(attemptedWord.length);
        expect(firstRowLetters.length).toBe(letterPositions.length);
        for(var i = 0; i < firstRowLetters.length; i++) {
            expect(firstRowLetters[i].letterState.attemptedLetter).toBe(attemptedWord[i]);
            expect(firstRowLetters[i].letterState.positionIndicator).toBe(letterPositions[i]);
            expect(firstRowLetters[i].letterState.isLetterAttempted).toBe(true);
        }

        // The third row shouldn't be locked and all row letters should have isLetterAttempted set to false.
        expect(latestRowStates[2].rowState.isRowLocked).toBe(false);
        let thirdRowLetters = latestRowStates[2].latestLetterStates;
        for(var i = 0; i < thirdRowLetters.length; i++) {
            expect(thirdRowLetters[i].letterState.isLetterAttempted).toBe(false);
        }
    });
});
