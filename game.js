const data = require("./data");

const SettingsState = {
    CLOSED: 0,
    OPEN: 1
};

/*
Finding values for the settings modal.
*/
const MODAL_SETTINGS_ACTIVE = "#modal_settings[class='mini_modal active']";
const MODAL_SETTINGS_INACTIVE = "#modal_settings[class='mini_modal']";

/*
Finding values for the open settings button and close settings button.
*/
const OPEN_SETTINGS_BUTTON = ".buttons.flex button[data-modal-id='#modal_settings']";
const CLOSE_SETTINGS_BUTTON = "#modal_settings[class='mini_modal active'] > button[class='close']";

/*
Given a page, query the current state of the settings modal.

Arguments:
:page: An instance of Page.

Returns:
One of the SettingsState enum indicating the settings modal state.
*/
async function getCurrentSettingsState(page) {
    return await Promise.allSettled([
        page.waitForSelector(MODAL_SETTINGS_ACTIVE, {
            timeout: 800
        }),
        page.waitForSelector(MODAL_SETTINGS_INACTIVE, {
            timeout: 800
        })
    ]).then((results) => (results[0].status === "fulfilled" && results[1].status === "rejected") ? SettingsState.OPEN : SettingsState.CLOSED);
}

/*
Given a page open to a game of Wordle, ensure that the settings modal is in the given state.

Arguments:
:page: An instance of Page.
:requiredState: One of the SettingState enums.
*/
async function ensureSettingsAre(page, requiredState) {
    let isSettingsActive = (await getCurrentSettingsState(page)) === SettingsState.OPEN;
    let shouldSettingsBeActive = requiredState === SettingsState.OPEN;

    if(shouldSettingsBeActive !== isSettingsActive) {
        console.log(`Settings modal open: ${isSettingsActive}, it should be ${shouldSettingsBeActive}`);
        if(shouldSettingsBeActive) {
            // Locate open settings button & click it.
            await page.waitForSelector(OPEN_SETTINGS_BUTTON, { timeout: 2000 })
                .then((openSettings) => openSettings.click())
                .then((clicked) => page.waitForSelector(MODAL_SETTINGS_ACTIVE, { timeout: 2000 }));
        } else {
            // Locate close settings button & click it.
            await page.waitForSelector(CLOSE_SETTINGS_BUTTON, { timeout: 2000 })
                .then((closeSettings) => closeSettings.click())
                .then((clicked) => page.waitForSelector(MODAL_SETTINGS_INACTIVE, { timeout: 2000 }));
        }
    }
}

/*
Read the game container from the given page.
This will throw an exception if the page is not on a wordle game.

Arguments:
:page: An instance of Page.

Returns:
Handle to the game container element.
*/
async function readGameContainer(page) {
    let gameContainer = await page.$("#root > .App-container > .Game");
    if(gameContainer === undefined || gameContainer === null) {
        throw "Failed to read game container from page.";
    }
    return gameContainer;
}

/*
Given a page, which should be on a game of wordle, read an integer indicating the number of letters
in the first row; this is the text file to read from.

Arguments:
:page: An instance of Page.

Returns:
Integer, the number of letters in first row.
*/
async function getLetterCount(page) {
    // Read the game container.
    let gameContainer = await readGameContainer(page);
    // Read the first row from the game container.
    let firstRow = await gameContainer.$(".game_rows > .Row");
    // Return the number of buttons in the row.
    return (await firstRow.$$(".Row-letter")).length;
}

/*
Given a page, which should be on a game of wordle, read an integer indicating the number of rows
in the game.

Arguments:
:page: An instance of Page.

Returns:
Integer, the number of rows.
*/
async function getRowCount(page) {
    // Read the game container.
    let gameContainer = await readGameContainer(page);
    // Return the number of rows.
    return (await gameContainer.$$(".game_rows > .Row")).length;
}

/*
Given a page, which should be on a game of wordle, read the wordle keyboard's current state.

Arguments:
:page: An instance of Page.

Returns:
An object instance describing the current state of the keyboard.
*/
async function readKeyboard(page) {
    // Read the game container, then the game keyboard and all its rows.
    let gameContainer = await readGameContainer(page);
    let gameKeyboard = await gameContainer.$(".Game-keyboard");
    let gameKeyboardRows = await gameKeyboard.$$(".Game-keyboard-row");
    // Create a resulting keys dictionary to hold the state of all keys.
    let keyStates = {};
    // Iterate each row, then each button within each row.
    for(let keyboardRow of gameKeyboardRows) {
        let keyboardButtons = await keyboardRow.$$(".Game-keyboard-button");
        for(keyboardButton of keyboardButtons) {
            // Now for each button, create a key object that will contain the lower case character, the letter location indicator and the handle for the button.
            let buttonInfo = await keyboardButton.evaluate((button) => {
                return {
                    innerKey: button.innerText,
                    buttonClass: button.getAttribute("class")
                }
            });
            let keyState = await data.makeKeyboardKeyState(buttonInfo.innerKey, buttonInfo.buttonClass);
            keyState.handle = keyboardButton;
            keyStates[keyState.key] = keyState
        }
    }
    let keyboardState = await data.makeKeyboardState(keyStates);
    keyboardState.handle = gameKeyboard;
    return keyboardState;
}

/*
Given a page, handle to a letter and the index within the row of that letter, read and return the state of the letter.

Arguments:
:page: An instance of Page.
:liveRowState: A state object referring to the containing row for this letter.
:letterHandle: A handle to the letter within its row.
:letterIndex: The index of the letter within its row.

Returns:
An object instance describing the current state of the requested letter.
*/
async function readLiveLetterState(page, liveRowState, letterHandle, letterIndex) {
    // Read the info from the page.
    let letterInfo = await letterHandle.evaluate((letter) => {
        return {
            attemptedKey: letter.innerText,
            rowLetterClass: letter.getAttribute("class")
        }
    });
    // Make a letter state from this info.
    let latestLetterState = await data.makeLetterState(
        letterInfo.attemptedKey,
        letterInfo.rowLetterClass,
        liveRowState.rowState.rowIndex,
        letterIndex,
        (liveRowState.rowState.rowIndex * liveRowState.rowState.numberOfLetters) + letterIndex

    );
    // Add this letter state to our rowState, also.
    liveRowState.rowState.letters.push(latestLetterState);
    // Create our LiveLetterState, which augments letterState with the live aspect; handle.
    let liveLetterState = {
        letterState: latestLetterState,
        handle: letterHandle
    };
    return liveLetterState;
}

/*
Given a page, handle to a .Row and the index of the given row, read and return the state of the row.

Arguments:
:page: An instance of Page.
:liveGameState: A state object referring to the containing game state for this row.
:rowHandle: A handle to the row on the current page.
:rowIndex: The index, in the grid, of the row.

Returns:
An object instance describing the current state of the requested row.
*/
async function readLiveRowState(page, liveGameState, rowHandle, rowIndex) {
    // First, read all letters from the row and get the number.
    let allLetters = await rowHandle.$$(".Row-letter");
    let numLetters = allLetters.length;
    // Then, read the row info and get a state from that.
    let rowInfo = await rowHandle.evaluate((row) => {
        return {
            rowClass: row.getAttribute("class")
        }
    });
    let latestRowState = await data.makeRowState(rowInfo.rowClass, numLetters, rowIndex);
    let liveRowState = {
        rowState: latestRowState,
        handle: rowHandle
    }
    // For each letter, produce a LetterState and add each to a latestLetterStates array.
    let latestLetterStates = [];
    for(var i = 0; i < numLetters; i++) {
        // Now, read the letter from page, this will also add it to the non-live rowState.
        let latestLetterState = await readLiveLetterState(page, liveRowState, allLetters[i], i);
        latestLetterStates.push(latestLetterState);
    }
    // Add this row state to our gameState, also.
    liveGameState.gameState.rows.push(latestRowState);
    // Set our live letter states.
    liveRowState.latestLetterStates = latestLetterStates;
    // Return.
    return liveRowState;
}

/*
Given a page, which should be on a game of wordle, read the wordle game grid's current state.

Arguments:
:page: An instance of Page.

Returns:
An object instance describing the current state of the entire game grid.
*/
async function readLiveGameState(page) {
    // Read the entire game from the page. Create a state for it.
    let gameContainer = await readGameContainer(page);
    let latestGameState = await data.makeGameState();
    // Create our resulting LiveGameState.
    let liveGameState = {
        gameState: latestGameState,
        handle: gameContainer
    };
    // Now, read each row sequentially from the page, creating states for each.
    let latestLiveRowStates = [];
    let allRows = await gameContainer.$$(".game_rows > .Row");
    for(var i = 0; i < allRows.length; i++) {
        let latestRowState = await readLiveRowState(page, liveGameState, allRows[i], i);
        latestLiveRowStates.push(latestRowState);
    }
    // Set the latest LIVE row states and NON LIVE row states.
    liveGameState.latestRowStates = latestLiveRowStates;
    // Add our functions for this object now.
    liveGameState.findLiveRowState = async function(rowIndex) {
        for(let liveRowState of this.latestRowStates) {
            if(liveRowState.rowState.rowIndex == rowIndex) {
                return liveRowState;
            }
        }
        return null;
    }
    return liveGameState;
}

/*
Write the given letter to the targeted live letter state at index letterIndex.
This is done just through call type() with Puppeteer and verifying the correct box got the correct letter.

Arguments:
:page: An instance of Page.
:liveRowState: The most recent live row state.
:liveLetterState: The most recent live letter state of the target letter.
:letter: The letter, in lowercase ASCII, to type.

Returns:
An up to date LiveLetterState object pointing at the target letter state used as input.
*/
async function writeLetterAttempt(page, liveRowState, liveLetterState, letterIndex, letter) {
    await liveLetterState.handle.type(letter);
    let latestLetterState = await readLiveLetterState(page, liveRowState, liveLetterState.handle, letterIndex);
    return latestLetterState;
}

/*
Write the given word to the given live row state. This function will type the word out while simultaneously
looking back to ensure all previous actions are supported by the current actions.

Arguments:
:page: An instance of Page.
:liveGameState: The most recent live game state.
:liveRowState: The most recent live row state of the target row.
:word: The word, in lowercase ASCII, to type.

Returns:
An up to date LiveRowState object pointing at the target row state used as input.
This will contain the changes made by typing the word.
*/
async function writeWordAttempt(page, liveGameState, liveRowState, word, enterWord = true) {
    var writtenWord = [];
    var resultLiveRowState = null;
    var resultLastLetterState = null;
    console.log(`Writing word '${word}' to game...`);
    for(var letterIndex = 0; letterIndex < word.length; letterIndex++) {
        // Read an up-to-date live row state for the targeted row, each iteration.
        resultLiveRowState = await readLiveRowState(page, liveGameState, liveRowState.handle, liveRowState.rowState.rowIndex);
        // Iterate written word length, grab equivalent letter from the most recent live row state and ensure the letter contents match.
        for(var writtenWordIdx = 0; writtenWordIdx < writtenWord.length; writtenWordIdx++) {
            let latestLiveLetter = resultLiveRowState.latestLetterStates [writtenWordIdx];
            if(latestLiveLetter.letterState.attemptedLetter !== writtenWord [writtenWordIdx]) {
                throw `Failed to write word ${word} to row ${liveRowState.rowState.rowIndex}, written word index ${writtenWordIdx} contains character ${writtenWord [writtenWordIdx]}, but it should contain ${latestLiveLetter.letterState.attemptedLetter}`;
            }
        }

        console.log(`\tWriting letter ${word [letterIndex]} ...`);
        // Correct so far, call out to writeLetterAttempt to handle writing the letter itself.
        let targetedLiveLetterState = resultLiveRowState.latestLetterStates [letterIndex];
        resultLastLetterState = await writeLetterAttempt(page, resultLiveRowState, targetedLiveLetterState, letterIndex, word[letterIndex]);
        console.log(`\tWritten.`);
    }
    console.log("Written.");

    if(enterWord) {
        // Word is successfully written. Now, press the enter key.
        // I believe the trigger for entering is on the very last letter index anyway. The others I assume are set to report 'too short.'
        // Select last letter and press Enter, then, read the target row once more and return that as the result.
        console.log(`Confirming attempted word ${word} ...`);
        await resultLastLetterState.handle.press("Enter");
        /* TODO */
        // Build a promise array that will wait for all letters to have'.Row > div[class^="Row-letter letter-"]' - this means its locked.
        // For now, we'll just wait for 2.5 seconds.
        await page.waitForTimeout(2500);
        resultLiveRowState = await readLiveRowState(page, liveGameState, liveRowState.handle, liveRowState.rowState.rowIndex);
        console.log(`Confirmed.`);
    } else {
        console.log(`WARNING! enterWord=false given to writeWordAttempt(), we did not press enter or read a newer row state!`);
    }

    return resultLiveRowState;
}

/*
Clear the given row state by tapping backspace on the page itself. We'll iterate backwards along the number of letters
in the row, tapping backspace each time, then recounting the number of letters that are typed but not locked.

Arguments:
:page: An instance of Page.
:liveGameState: A LiveGameState.
:liveRowState: The target LiveRowState to clear.

Returns:
A freshly read live row state for the targeted row.
*/
async function clearRow(page, liveGameState, liveRowState) {
    let numLetters = liveRowState.rowState.numberOfLetters;
    // Iterate backwards, each time, counting the new number of letters not yet clear.
    var numSelected = numLetters;
    var latestLiveRowState = liveRowState;
    for(var letterIndex = numLetters - 1; letterIndex >= 0; letterIndex--) {
        console.log(`\tLetters to clear: ${numSelected}`);
        // Press backspace toward the letter handle itself. If this doesn't work, we can just use page.keyboard!
        console.log(`\tBackspace SENT to letter index ${letterIndex} on row ${latestLiveRowState.rowState.rowIndex}`);
        await latestLiveRowState.latestLetterStates [letterIndex].handle.press("Backspace");
        // Read a new live row state, then get the number of letters still selected.
        latestLiveRowState = await readLiveRowState(page, liveGameState, liveRowState.handle, liveRowState.rowState.rowIndex);
        numSelected = await latestLiveRowState.rowState.getNumSelected();
    }
    // Now, if num selected is greater than 0, this means we failed to backspace.
    if(numSelected > 0) {
        throw `Failed to backspace selected word in row ${liveRowState.rowState.rowIndex}! We have ${numSelected} left to do after finishing loop.`;
    }
    // Otherwise, all good.
    console.log(`Successfully reversed typing on row ${liveRowState.rowState.rowIndex}`);
    return latestLiveRowState;
}

exports.SettingsState = SettingsState;
exports.getCurrentSettingsState = getCurrentSettingsState;
exports.ensureSettingsAre = ensureSettingsAre;

exports.getLetterCount = getLetterCount;
exports.getRowCount = getRowCount;
exports.readKeyboard = readKeyboard;

exports.readLiveGameState = readLiveGameState;
exports.readLiveRowState = readLiveRowState;
exports.readLiveLetterState = readLiveLetterState;

exports.writeWordAttempt = writeWordAttempt;
exports.writeLetterAttempt = writeLetterAttempt;

exports.clearRow = clearRow;
