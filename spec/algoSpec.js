const fs = require("fs").promises;
const fss = require("fs");
const path = require("path");
const process = require("process");

const algo = require("../algo");
const data = require("../data");
const conf = require("../conf");

const fiveLetterWords = fss.readFileSync(path.join(process.cwd(), "import", "5-letter-words.txt"), "utf8").split(" ");
const startingWordList = fss.readFileSync(path.join(process.cwd(), "import", "5-letter-starting-words.txt"), "utf8").toLowerCase().split(" ");

let testWords = [
    "added", "place", "space", "hello", "grill",
    "stove", "coven", "loved", "moved", "grown"
];

async function getMatchedWords(regex) {
    return testWords.filter((word) => {
        if(regex.test(word)) {
            return true;
        }
        return false;
    })
}

describe("beginGame", () => {
    it("should correctly set up a game grid", async () => {
        // Setup a grid 6 high and 5 across.
        let currentGame = await algo.beginGame(6, 5, fiveLetterWords, startingWordList);
        // Ensure we have a correct absolute index, by grabbing all letters from all rows.
        let allGameLetters = [];
        for(var row of currentGame.gameRows) {
            for(var gameLetter of row) {
                allGameLetters.push(gameLetter);
            }
        }

        for(var i = 0; i < (6 * 5); i++) {
            expect(allGameLetters[i].absoluteIndex).toBe(i);
        }
    });
});

describe("filterUselessWords", () => {
    it("should remove all words that are used", async () => {
        let filteredProposedWords = await algo.filterUselessWords([ "added", "place" ], [], testWords);

        expect(filteredProposedWords.length).toBe(8);
        expect(filteredProposedWords).not.toContain("added");
        expect(filteredProposedWords).not.toContain("place");
    });

    it("should remove all words that don't contain a and e", async () => {
        let filteredProposedWords = await algo.filterUselessWords([], [ "a", "e" ], testWords);

        expect(filteredProposedWords.length).toBe(3);
        expect(filteredProposedWords).toContain("added");
        expect(filteredProposedWords).toContain("place");
        expect(filteredProposedWords).toContain("space");
    });
});

describe("getWhitelistWordRegExp", () => {
    it("should produce all wild character match", async () => {
        let whitelistVars = [
            { 0: undefined, 1: undefined, 2: undefined, 3: undefined, 4: undefined },
            { 0: [], 1: [], 2: [], 3: [], 4: [] },
            conf.ALL_ASCII,
            5
        ];

        // Should match all.
        let matchAllRegex = await algo.getWhitelistWordRegExp(whitelistVars[0], whitelistVars[1], whitelistVars[2], whitelistVars[3]);
        let matchedWords = await getMatchedWords(matchAllRegex);
        expect(matchedWords.length).toBe(10);
        expect(matchAllRegex).toEqual(/\w\w\w\w\w/);
    });

    it("should locate correct letters", async () => {
        let whitelistVars = [
            { 0: undefined, 1: undefined, 2: undefined, 3: undefined, 4: undefined },
            { 0: [], 1: [], 2: [], 3: [], 4: [] },
            conf.ALL_ASCII,
            5
        ];

        // Set second correct char to 'o' and the third to 'e', then get all matched words.
        whitelistVars [0] [1] = "o";
        whitelistVars [0] [3] = "e";
        let correctLetterRegex = await algo.getWhitelistWordRegExp(whitelistVars[0], whitelistVars[1], whitelistVars[2], whitelistVars[3]);
        let correctMatchedWords = await getMatchedWords(correctLetterRegex);
        expect(correctMatchedWords.length).toBe(3);
        expect(correctLetterRegex).toEqual(/\wo\we\w/);

        // Take away 'd' from allowed alphabet. We should still match coven.
        whitelistVars [2] = conf.ALL_ASCII.filter((letter) => {
            if(letter == "d") {
                return false;
            }
            return true;
        });
        let matchCovenRegex = await algo.getWhitelistWordRegExp(whitelistVars[0], whitelistVars[1], whitelistVars[2], whitelistVars[3])
        let matchCovenWords = await getMatchedWords(matchCovenRegex);
        expect(matchCovenWords.length).toBe(1);
        expect(matchCovenWords[0]).toBe("coven");
        expect(matchCovenRegex).toEqual(/(?:[abcefghijklmnopqrstuvwxyz])o(?:[abcefghijklmnopqrstuvwxyz])e(?:[abcefghijklmnopqrstuvwxyz])/);
    });
});

describe("getBlacklistWordRegExp", () => {
    it("should blacklist anything", async () => {
        let blacklistVars = [
            { 0: undefined, 1: undefined, 2: undefined, 3: undefined, 4: undefined },
            { 0: [], 1: [], 2: [], 3: [], 4: [] },
            { 0: [], 1: [], 2: [], 3: [], 4: [] },
            [],
            5
        ];

        // Should match all.
        let matchAllRegex = await algo.getBlacklistWordRegExp(blacklistVars[0], blacklistVars[1], blacklistVars[2], blacklistVars[3], blacklistVars[4]);
        let matchedWords = await getMatchedWords(matchAllRegex);
        expect(matchedWords.length).toBe(10);
        expect(matchAllRegex).toEqual(/\w\w\w\w\w/);
    });

    it("should blacklist any word with the letters; g and n", async () => {
        let blacklistVars = [
            { 0: undefined, 1: undefined, 2: undefined, 3: undefined, 4: undefined },
            { 0: [], 1: [], 2: [], 3: [], 4: [] },
            { 0: [], 1: [], 2: [], 3: [], 4: [] },
            [ "g", "n" ],
            5
        ];

        // Should match; everything except 'grown', 'grill' and 'coven.'
        let matchAllRegex = await algo.getBlacklistWordRegExp(blacklistVars[0], blacklistVars[1], blacklistVars[2], blacklistVars[3], blacklistVars[4]);
        let matchedWords = await getMatchedWords(matchAllRegex);
        expect(matchedWords.length).toBe(7);
        expect(matchedWords).not.toContain("grown");
        expect(matchedWords).not.toContain("grill");
        expect(matchedWords).not.toContain("coven");
        expect(matchAllRegex).toEqual(/[^gn][^gn][^gn][^gn][^gn]/);
    });

    it("should blacklist any word with the letters; g and n, and any word with the letters 'o' in second place and 'e' in last place.", async () => {
        let blacklistVars = [
            { 0: undefined, 1: undefined, 2: undefined, 3: undefined, 4: undefined },
            { 0: [], 1: [], 2: [], 3: [], 4: [] },
            { 0: [], 1: [ "o" ], 2: [], 3: [], 4: [ "e" ] },
            [ "g", "n" ],
            5
        ];

        // Should match; everything except 'grown', 'grill', 'coven', 'moved', 'loved', 'stove', 'place', 'space'.
        let matchAllRegex = await algo.getBlacklistWordRegExp(blacklistVars[0], blacklistVars[1], blacklistVars[2], blacklistVars[3], blacklistVars[4]);
        let matchedWords = await getMatchedWords(matchAllRegex);
        expect(matchedWords.length).toBe(2);
        expect(matchedWords).not.toContain("grown");
        expect(matchedWords).not.toContain("grill");
        expect(matchedWords).not.toContain("coven");
        expect(matchedWords).not.toContain("moved");
        expect(matchedWords).not.toContain("loved");
        expect(matchedWords).not.toContain("stove");
        expect(matchedWords).not.toContain("place");
        expect(matchedWords).not.toContain("space");
        expect(matchAllRegex).toEqual(/[^gn][^gno][^gn][^gn][^gne]/);
    });

    it("should blacklist any word with the letters; g and n, and any word with the letters 'o' in second place and 'e' in last place.", async () => {
        let blacklistVars = [
            { 0: undefined, 1: undefined, 2: undefined, 3: undefined, 4: undefined },
            { 0: [], 1: [], 2: [], 3: [], 4: [] },
            { 0: [], 1: [ "o" ], 2: [], 3: [], 4: [ "e" ] },
            [ "g", "n" ],
            5
        ];

        // Should match; everything except 'grown', 'grill', 'coven', 'moved', 'loved', 'stove', 'place', 'space'.
        let matchAllRegex = await algo.getBlacklistWordRegExp(blacklistVars[0], blacklistVars[1], blacklistVars[2], blacklistVars[3], blacklistVars[4]);
        let matchedWords = await getMatchedWords(matchAllRegex);
        expect(matchedWords.length).toBe(2);
        expect(matchedWords).not.toContain("grown");
        expect(matchedWords).not.toContain("grill");
        expect(matchedWords).not.toContain("coven");
        expect(matchedWords).not.toContain("moved");
        expect(matchedWords).not.toContain("loved");
        expect(matchedWords).not.toContain("stove");
        expect(matchedWords).not.toContain("place");
        expect(matchedWords).not.toContain("space");
        expect(matchAllRegex).toEqual(/[^gn][^gno][^gn][^gn][^gne]/);
    });
});

describe("game", () => {
    let currentGame = null;

    beforeEach(async () => {
        currentGame = await algo.beginGame(6, 5, fiveLetterWords, startingWordList);
    }, 90000);

    afterEach(async () => {
        await algo.endGame(currentGame);
        currentGame = null;
    });

    it("should process attempted words correctly", async () => {
        // Create a new locked row state.
        let lockedRowState = await data.makeRowState("Row Row-locked-in", 5, 0);
        // Create a list of letters for this row;, p, l, a, c, e
        // elementInnerText, elementClass, rowIndex, letterIndex, absoluteIndex
        lockedRowState.letters = [
            await data.makeLetterState("p", "Row-letter letter-absent", 0, 0, 0),
            await data.makeLetterState("l", "Row-letter letter-absent", 0, 1, 1),
            await data.makeLetterState("a", "Row-letter letter-elsewhere", 0, 2, 2),
            await data.makeLetterState("c", "Row-letter letter-absent", 0, 3, 3),
            await data.makeLetterState("e", "Row-letter letter-elsewhere", 0, 4, 4)
        ];

        // We don't need keyboard state for this.
        await algo.wordAttempted(currentGame, "place", lockedRowState, null);
        // Ensure blacklisted letters has 3 entries; p, l and c.
        for(let blacklisted of [ "p", "l", "c" ]) {
            expect(currentGame.absentLetters).toContain(blacklisted);
        }
        // Letter 'a' should be in grand slots index 2 under 'never.'
        expect(currentGame.grandSlots [2] ["never"]).toContain("a");
        // Letter 'e' should be in grand slots index 4 under 'never.'
        expect(currentGame.grandSlots [4] ["never"]).toContain("e");

        // Provide another locked row state, this time, with a correct letter.
        let lockedRowState2 = await data.makeRowState("Row Row-locked-in", 5, 1);
        lockedRowState2.letters = [
            await data.makeLetterState("a", "Row-letter letter-elsewhere", 1, 0, 5),
            await data.makeLetterState("d", "Row-letter letter-absent", 1, 1, 6),
            await data.makeLetterState("d", "Row-letter letter-absent", 1, 2, 7),
            await data.makeLetterState("e", "Row-letter letter-correct", 1, 3, 8),
            await data.makeLetterState("d", "Row-letter letter-absent", 1, 4, 9)
        ];

        // Attempt this row.
        await algo.wordAttempted(currentGame, "added", lockedRowState2, null);
        // Now, blacklisted should also contain D.
        // Ensure blacklisted letters has 3 entries; p, l and c.
        for(let blacklisted of [ "p", "l", "c", "d" ]) {
            expect(currentGame.absentLetters).toContain(blacklisted);
        }

        // Get allowed alphabet.
        let allowedAlphabet = await algo.getAllowedAlphabet(currentGame);
        // Allowed alphabet should not contain any of the following; p, l, c, d.
        for(let alphabetLetter of allowedAlphabet) {
            expect(currentGame.absentLetters).not.toContain(alphabetLetter);
        }
    });

    it("can play a full game", async () => {
        let tamedRowState = await data.makeRowState("Row Row-locked-in", 5, 0);
        tamedRowState.letters = [
            await data.makeLetterState("t", "Row-letter letter-absent", 0, 0, 0),
            await data.makeLetterState("a", "Row-letter letter-absent", 0, 1, 1),
            await data.makeLetterState("m", "Row-letter letter-elsewhere", 0, 2, 2),
            await data.makeLetterState("e", "Row-letter letter-elsewhere", 0, 3, 3),
            await data.makeLetterState("d", "Row-letter letter-elsewhere", 0, 4, 4)
        ];

        let medicRowState = await data.makeRowState("Row Row-locked-in", 5, 1);
        medicRowState.letters = [
            await data.makeLetterState("m", "Row-letter letter-elsewhere", 1, 0, 5),
            await data.makeLetterState("e", "Row-letter letter-correct", 1, 1, 6),
            await data.makeLetterState("d", "Row-letter letter-elsewhere", 1, 2, 7),
            await data.makeLetterState("i", "Row-letter letter-correct", 1, 3, 8),
            await data.makeLetterState("c", "Row-letter letter-absent", 1, 4, 9)
        ];

        let devilRowState = await data.makeRowState("Row Row-locked-in", 5, 2);
        devilRowState.letters = [
            await data.makeLetterState("d", "Row-letter letter-correct", 2, 0, 10),
            await data.makeLetterState("e", "Row-letter letter-correct", 2, 1, 11),
            await data.makeLetterState("v", "Row-letter letter-absent", 2, 2, 12),
            await data.makeLetterState("i", "Row-letter letter-correct", 2, 3, 13),
            await data.makeLetterState("l", "Row-letter letter-absent", 2, 4, 14)
        ];

        let denimRowState = await data.makeRowState("Row Row-locked-in", 5, 3);
        denimRowState.letters = [
            await data.makeLetterState("d", "Row-letter letter-correct", 3, 0, 15),
            await data.makeLetterState("e", "Row-letter letter-correct", 3, 1, 16),
            await data.makeLetterState("n", "Row-letter letter-correct", 3, 2, 17),
            await data.makeLetterState("i", "Row-letter letter-correct", 3, 3, 18),
            await data.makeLetterState("m", "Row-letter letter-correct", 3, 4, 19)
        ];

        // Attempt all 3 words.
        await algo.wordAttempted(currentGame, "tamed", tamedRowState, null);
        let nextWordToAttempt1 = await algo.getNextWordToAttempt(currentGame);

        await algo.wordAttempted(currentGame, "medic", medicRowState, null);
        let nextWordToAttempt2 = await algo.getNextWordToAttempt(currentGame);

        await algo.wordAttempted(currentGame, "devil", devilRowState, null);
        let nextWordToAttempt3 = await algo.getNextWordToAttempt(currentGame);

        // This should be denim.
        expect(nextWordToAttempt3).toBe("denim");

        // Play the word to complete the puzzle.
        await algo.wordAttempted(currentGame, "denim", denimRowState, null);

        // Now, get our game result.
        let gameResult = await algo.endGame(currentGame);
        // We should have 6 rows on offer, 4 rows used.
        expect(gameResult.numRows).toBe(6);
        expect(gameResult.numRowsUsed).toBe(4);
        // 5 letters per row.
        expect(gameResult.numLettersPerRow).toBe(5);
        // We should have won.
        expect(gameResult.isGameSolved).toBe(true);
        // Solution should be 'denim'
        expect(gameResult.solution).toBe("denim");

        // Get each row from our game result.
        let gameResultRow0 = gameResult.rows [0];
        // The first should have row index 0, attempted word 'tamed', 0 correct, 3 elsewhere, 2 absent.
        expect(gameResultRow0.attemptedWord).toBe("tamed");
        expect(gameResultRow0.rowIndex).toBe(0);
        expect(gameResultRow0.numCorrect).toBe(0);
        expect(gameResultRow0.numElsewhere).toBe(3);
        expect(gameResultRow0.numAbsent).toBe(2);

        let gameResultRow1 = gameResult.rows [1];
        // The second should have row index 1, attempted word 'medic', 2 correct, 2 elsewhere, 1 absent.
        expect(gameResultRow1.attemptedWord).toBe("medic");
        expect(gameResultRow1.rowIndex).toBe(1);
        expect(gameResultRow1.numCorrect).toBe(2);
        expect(gameResultRow1.numElsewhere).toBe(2);
        expect(gameResultRow1.numAbsent).toBe(1);

        let gameResultRow2 = gameResult.rows [2];
        // The third should have row index 2, attempted word 'devil', 3 correct, 0 elsewhere, 2 absent.
        expect(gameResultRow2.attemptedWord).toBe("devil");
        expect(gameResultRow2.rowIndex).toBe(2);
        expect(gameResultRow2.numCorrect).toBe(3);
        expect(gameResultRow2.numElsewhere).toBe(0);
        expect(gameResultRow2.numAbsent).toBe(2);

        let gameResultRow3 = gameResult.rows [3];
        // The fourth should have row index 3, attempted word 'denim', 5 correct, 0 elsewhere, 0 absent.
        expect(gameResultRow3.attemptedWord).toBe("denim");
        expect(gameResultRow3.rowIndex).toBe(3);
        expect(gameResultRow3.numCorrect).toBe(5);
        expect(gameResultRow3.numElsewhere).toBe(0);
        expect(gameResultRow3.numAbsent).toBe(0);

        // Make a master game result.
        let masterGameResult = await data.makeMasterGameResult();
        await masterGameResult.gameSolved(gameResult);
        // 1 solved.
        expect(masterGameResult.numSolved).toBe(1);
    });
});
