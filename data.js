const fs = require("fs").promises;
const fss = require("fs");
const path = require("path");
const process = require("process");

const com = require("./com");

/*
Create a MasterGameResult object, this will receive a collection of games finished in one session, and report their cumulative results.

Arguments:
--

Results:
A new MasterGameResult object.
*/
async function makeMasterGameResult() {
    let masterGameResult = {
        sessionStarted: Math.floor(Date.now() / 1000),
        sessionEnded: undefined,
        sessionDuration: undefined,
        successPercentage: undefined,

        numGames: 0,
        games: [],

        numSolved: 0,
        solvedGames: [],

        numLost: 0,
        lostGames: []
    };

    masterGameResult.completeSession = async function() {
        this.sessionEnded = Math.floor(Date.now() / 1000);
        this.sessionDuration = this.sessionEnded - this.sessionStarted;
        this.successPercentage = Math.round((this.numSolved/this.numGames) * 100);
    }

    masterGameResult.gameSolved = async function(gameResult) {
        this.numSolved++;
        this.numGames++;
        this.solvedGames.push(gameResult);
        this.games.push(gameResult);
    };

    masterGameResult.gameLost = async function(gameResult) {
        this.numLost++;
        this.numGames++;
        this.lostGames.push(gameResult);
        this.games.push(gameResult);
    };
    return masterGameResult;
}

/*
Given the number of letters per a row in the given game, find and read from the equivalent
text file found under /import.

Arguments:
:numLettersPerRow: The number of letters in each row.

Returns:
An array of strings containing the word list.
*/
async function findReadWordList(numLettersPerRow) {
    let fileName = `${numLettersPerRow}-letter-words.txt`;
    let relativePath = path.join("import", fileName);
    let absolutePath = path.join(process.cwd(), relativePath);

    if(!(await com.fileExists(absolutePath))) {
        throw `The requested word list; ${fileName} does not exist!`;
    }
    let contentString = await fs.readFile(absolutePath, "utf8");
    return contentString.trim().split(" ");
}

/*
Given the number of letters per a row in the given game, find and read from the equivalent
starting words text file found under /import.

Arguments:
:numLettersPerRow: The number of letters in the target word.

Returns:
An array of strings containing the starting word list.
*/
async function readStartingWordList(numLettersPerRow) {
    let fileName = `${numLettersPerRow}-letter-starting-words.txt`;
    let relativePath = path.join("import", fileName);
    let absolutePath = path.join(process.cwd(), relativePath);

    if(!(await com.fileExists(absolutePath))) {
        throw `The starting words list; ${fileName} does not exist!`;
    }
    let contentString = await fs.readFile(absolutePath, "utf8");
    return contentString.trim().toLowerCase().split(" ");
}

/*
Given raw data that decribes a keyboard button on the game screen, create a dictionary, KeyState that describes the key properties:
    -> Letter within
    -> Letter indicator (absent/elsewhere/correct)

Arguments:
:elementInnerText: The inner text for the letter element. If this is undefined, we'll assume there is no letter attempted.
:elementClass: The class element of the letter container.

Returns:
A dictionary, called KeyState, that contains formatted data for the current state of the requested keyboard key.
*/
async function makeKeyboardKeyState(elementInnerText, elementClass) {
    // Extract the button position descriptor from the class. Use regex to do this.
    const indicatorRegexResult = /^[\w-]+\s*(.*)$/.exec(elementClass);
    let indicator = indicatorRegexResult[1] !== "" ? indicatorRegexResult[1] : "";
    return {
        key: elementInnerText,
        positionIndicator: indicator
    }
}

/*
Create a new dictionary of key states containing those from the keyStates dictionary that match
the given target indicator.

Arguments:
:keyStates: A dictionary of objects resulting from buttonInfoToKeyState()
:targetIndicator: The indicator to collect from keyStates and make the new dictionary from.

Returns:
A dictionary of the keys with the targeted indicator.
*/
async function extractKeysWithIndicator(keyStates, targetIndicator) {
    let resultKeys = {};
    for(const [innerKey, keyState] of Object.entries(keyStates)) {
        if(keyState.positionIndicator == targetIndicator) {
            resultKeys[innerKey] = keyState;
        }
    }
    return resultKeys;
}

/*
Given raw data, create a KeyboardState object that communicates the key positions and usage for
the keyboard currently on screen.

Arguments:
:keyStates: A dictionary containing entries built by buttonInfoToKeyState.

Returns:
A dictionary, called KeyboardState, that contains formatted data for the current state of the on screen keyboard.
*/
async function makeKeyboardState(keyStates) {
    // Sort all letters into secondary dictionaries so we can have a better idea with less work.
    let absentLetters = await extractKeysWithIndicator(keyStates, "letter-absent");
    let elsewhereLetters = await extractKeysWithIndicator(keyStates, "letter-elsewhere");
    let correctLetters = await extractKeysWithIndicator(keyStates, "letter-correct");
    // Create a keyboard state, along with timestamp of when it was created.
    return {
        snapshotTaken: Math.floor(Date.now() / 1000),
        keys: keyStates,
        absentLetters: absentLetters,
        elsewhereLetters: elsewhereLetters,
        correctLetters: correctLetters
    }
}

/*
Given raw data that decribes a game row letter, create a dictionary, LetterState that describes the game letter properties:
    -> Letter that's been attempted (if any)
    -> Is any letter attempted? (Attempted meaning locked in alongside the row)
    -> Is a letter typed in, but not yet locked in?
    -> Letter indicator (absent/elsewhere/correct)

Arguments:
:elementInnerText: The inner text for the letter element. If this is undefined, we'll assume there is no letter attempted.
:elementClass: The class element of the letter container.
:rowIndex: An integer representing the index for this row in the game grid.
:letterIndex: An integer representing the index for for this letter within the row.
:absoluteIndex: An integer representing the index of this letter within the grid.

Returns:
A dictionary, called LetterState, that contains formatted data for the current state of the requested letter.
*/
async function makeLetterState(elementInnerText, elementClass, rowIndex, letterIndex, absoluteIndex) {
    var posIndicator = undefined;
    var letterAttempted = false;
    var selected = false;

    const indicatorRegexResult = /^[\w-]+\s*(.*)$/.exec(elementClass);
    let secondClass = indicatorRegexResult[1];

    if(secondClass === "") {
        // No letter typed, unlocked.
    } else if(secondClass === "selected") {
        // Letter typed, not locked in.
        selected = true;
    } else {
        // Letter typed, locked in, result returned.
        posIndicator = secondClass;
        letterAttempted = true;
    }

    return {
        rowIndex: rowIndex,
        letterIndex: letterIndex,
        absoluteIndex: absoluteIndex,
        attemptedLetter: elementInnerText.toLowerCase(),
        isSelected: selected,
        isLetterAttempted: letterAttempted,
        positionIndicator: posIndicator
    }
}

/*
Given raw data that decribes a game row, create a dictionary, RowState that describes the row properties:
    -> Is row locked?
    -> Number of letters
    -> The letters and their properties

Arguments:
:elementClass: The class element of the row.
:numLetters: The number of letters in the row.
:rowIndex: An integer representing the index of this row within the grid.

Returns:
A dictionary, called RowState, that contains formatted data for the current state of the requested row.
*/
async function makeRowState(elementClass, numLetters, rowIndex) {
    let rowState = {
        rowIndex: rowIndex,
        isRowLocked: /^Row\s+Row-locked-in/.test(elementClass),
        numberOfLetters: numLetters,
        letters: []
    }
    // Add a function to this class that will count the number of clear letters. (isSelected == true)
    rowState.getNumSelected = async function() {
        var numSelected = 0;
        for(let letterState of this.letters) {
            if(letterState.isSelected) {
                numSelected++;
            }
        }
        return numSelected;
    };
    return rowState;
}

/*
Given raw data that decribes a game, create a dictionary, GameState that describes the game properties:
    --

Arguments:
--

Returns:
A dictionary, called GameState, that contains formatted data for the current state of the game.
*/
async function makeGameState() {
    // Using rowInfoLsit,
    return {
        rows: []
    }
}

/* Misc */
exports.findReadWordList = findReadWordList;
exports.readStartingWordList = readStartingWordList;
exports.makeMasterGameResult = makeMasterGameResult;

/* Game grid */
exports.makeLetterState = makeLetterState;
exports.makeRowState = makeRowState;
exports.makeGameState = makeGameState;

/* Keyboard */
exports.makeKeyboardState = makeKeyboardState;
exports.makeKeyboardKeyState = makeKeyboardKeyState;
exports.extractKeysWithIndicator = extractKeysWithIndicator;
