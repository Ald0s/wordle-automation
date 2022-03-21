// sudo sysctl -w kernel.unprivileged_userns_clone=1

const conf = require("./conf");
const game = require("./game");
const algo = require("./algo");
const data = require("./data");

const assert = require("assert");

/*
Play games until this integer reaches 0.
*/
var NUM_GAMES_TO_PLAY = 20;

/*
If this is true, restarts will be issued until NUM_GAMES_TO_PLAY reaches 0.
If this is false, this will ignore number of games to play, and will trigger an exit.
*/
var SHOULD_RESTART = true;

/*
Determines whether the current page has a valid wordle game running.
Returns true if so, false otherwise.

Arguments:
:page: An instance of Page.

Returns:
:boolean: Whether the current game is valid or not.
*/
async function isWordleGameValid(page) {
    let gameRowsConainer = await page.$(".App-container > .Game > .game_rows");
    return gameRowsConainer !== null && gameRowsConainer !== undefined;
}

/*
Requests the next word to play from algo, based on previous plays, then writes that word to the given row.
If the row is locked on return, Wordle accepted our play, and we'll pass that to algo as word accepted, otherwise we'll iterate until we
can find an accepted play.

Arguments:
:page: An instance of Page.
:currentGame: Our game instance to use.
:liveGameState: The most recent game state.
:liveRowState: The target row to write the next word to.

Returns:
Boolean indicating whether or not the process was a success.
*/
async function playNextWordInRow(page, currentGame, liveGameState, liveRowState) {
    while(true) {
        let nextWord = await algo.getNextWordToAttempt(currentGame);
        // If we can't figure out what the next word is; just die.
        if(nextWord === null) {
            console.log(`FATAL ERROR! Couldn't play any more; getNextWordToAttempt has returned null. This means we require more training/specialised logic.`);
            return false;
        }
        console.log(`Attempting word '${nextWord}'`);
        // Attempt to write the next word to the game, we receive back a LiveRowState, from this, we will extract the inner row state and
        // pass to algorithm to update our backend game.
        let latestLiveRowState = await game.writeWordAttempt(page, liveGameState, liveRowState, nextWord);
        // If the row is not locked in, that means the word we attempted is no longer accepted by Wordle, at least for this game.
        // Let algo know, clear the live row state via game, then cycle again.
        if(!latestLiveRowState.rowState.isRowLocked) {
            console.log(`Failed to lock row - this word (${nextWord}) is probably not accepted by wordle.`);
            await algo.wordNotAccepted(currentGame, nextWord);
            await game.clearRow(page, liveGameState, latestLiveRowState);
            continue;
        }
        // Otherwise, successfully locked in. Let algo know the word was attempted.
        console.log(`Word ${nextWord} has been attempted, update game state...`);
        await algo.wordAttempted(currentGame, nextWord, latestLiveRowState.rowState);
        break;
    }
    return true;
}

/*
Attempt to locate and click a restart button on the given modal.
This should be called in response to solving/losing a puzzle.

Arguments:
:page: An instance of Page.
:finishModal: The modal from which to search for the restart button.

Returns:
A boolean indicating success.
*/
async function restartGameGrid(page, finishModal) {
    let restartButton = await finishModal.waitForSelector(".restart_btn > button");
    /*
    TODO Issue #1: Review.
    Some weird issue occurs here with that restart button.
    Click sometimes returns undefined, though the restart button is present.
    */
    for(var x = 0; x < 10; x++) {
        let clickedButton = await restartButton.click()
            .catch((e) => {
                console.log(`Error in restartGameGrid: ${e}`);
                return true;
            });
        // Count the number of locked rows. There must be 0.
        let lockedRows = await page.$$(".Row.Row-locked-in");
        if(lockedRows.length > 0) {
            console.log(`Failed to restart. There are still ${lockedRows.length} locked rows.`);
        } else if(clickedButton !== undefined) {
            console.log(`Grid has been restarted.`);
            return true;
        }
        await page.waitForTimeout(900);
    }
    console.log(`Failed to find/click the restart button!!`);
    return false;
}

/*
If the game was solved, we'll look for the restart button and click it.
Otherwise, if it failed, we'll restart anyway.

Arguments:
:page: An instance of Page.
:gameResult: A result from calling algo::endGame which describes the outcome of the game.

Returns:
--
*/
async function handleEndOfGame(page, masterGameResult, gameResult) {
    try {
        NUM_GAMES_TO_PLAY--;
        // If we have 0 games to play after this, set SHOULD_RESTART to false.
        if(NUM_GAMES_TO_PLAY == 0) {
            console.log(`We've played the maximum number of games allocated for this session.`);
            SHOULD_RESTART = false;
        } else {
            // We have games left.
            console.log(`Handling end of game; we have ${NUM_GAMES_TO_PLAY} games left to play for this session..`);
        }

        if(gameResult.isGameSolved) {
            console.log(`Game was solved successfully!`);
            await masterGameResult.gameSolved(gameResult);

            if(SHOULD_RESTART) {
                console.log(`We are able to restart! Doing that now.`);
                // Wait for the restart button, then click it.
                console.log(`Waiting for restart button...`);
                // Find the win modal.
                let modalWinFinished = await page.waitForSelector(".modal_finish.poof.active");
                // Now, click the restart button.
                let restarted = await restartGameGrid(page, modalWinFinished);
                if(restarted === false) {
                    throw `ERROR! Failed to click restart button, shutting it down.`
                }
            }
        } else if(gameResult.isGameLost) {
            console.log(`Failed to solve the puzzle. :(`);
            await masterGameResult.gameLost(gameResult);

            if(SHOULD_RESTART) {
                console.log(`We are able to restart! Doing that now.`);
                // Wait for the restart button, then click it.
                console.log(`Waiting for restart button...`);
                // Find the lose modal.
                let modalLostFinished = await page.waitForSelector(".modal_finish.active");
                // Now, click the restart button.
                let restarted = await restartGameGrid(page, modalLostFinished);
                if(restarted === false) {
                    throw `ERROR! Failed to click restart button, shutting it down.`
                }
            }
        } else {
            // Was this an error?
            console.log(`End of game reached - neither solved or lost. This was probably due to an error. We'll die instead.`);
            SHOULD_RESTART = false;
        }
    } catch(e) {
        console.log(e);
        SHOULD_RESTART = false;
    }
}

/*
Given the page instance, which should be on a valid Wordle game, we'll execute our logic to automate wordle. We'll continually play games
until we reach the end criteria. Each game played will have its result saved in a master results object, this will be returned at the very end.

Arguments:
:page: An instance of Page.

Returns:
MasterResult object, describing how all the games went.
*/
async function playWordle(page) {
    // Set master options from config.
    NUM_GAMES_TO_PLAY = conf.NUM_GAMES_TO_PLAY;
    
    // Create a master game result.
    let masterGameResult = await data.makeMasterGameResult();
    do {
        // Ensure we have a valid game up.
        if(!(await isWordleGameValid(page))) {
            throw "Failed to play Wordle; the game is invalid!";
        }
        // Get the number of rows and letters per row.
        let numRows = await game.getRowCount(page);
        let numLettersPerRow = await game.getLetterCount(page);
        // Read the appropriate word list.
        let wordList = await data.findReadWordList(numLettersPerRow);
        // Read our starting word list, too.
        let startingWordList = await data.readStartingWordList(numLettersPerRow);
        // Create a new game instance.
        let currentGame = await algo.beginGame(numRows, numLettersPerRow, wordList, startingWordList);
        // Now that we have a game instance, loop for each row.
        for(var rowIndex = 0; rowIndex < numRows; rowIndex++) {
            // Within each loop, we'll read an entirely new game state.
            let currentLiveGameState = await game.readLiveGameState(page);
            // Now, from this game state, find the row we're targeting in this iteration of the loop and ensure it is not locked.
            // If it is, post a warning then continue.
            let targetedLiveRowState = await currentLiveGameState.findLiveRowState(rowIndex);
            assert(targetedLiveRowState !== null);
            if(targetedLiveRowState.rowState.isRowLocked) {
                console.log(`WARNING! Skipped row index ${rowIndex}, it is reportedly locked (already complete?)`);
                /*
                TODO: Related to Issue #1, when restart button not clicked properly, grid does not reset, and rows remain locked.
                This check catches that issue; for now as its solved, logic will continue.
                */
                return false;
            }
            // Now, we can play the word.
            console.log(`Playing word #${rowIndex+1} ...`);
            let playResult = await playNextWordInRow(page, currentGame, currentLiveGameState, targetedLiveRowState);
            if(playResult === false) {
                throw `Failed to play next word at row ${rowIndex} - returned false.`;
            }
            if(currentGame.isGameSolved || currentGame.isGameLost) {
                let gameResult = await algo.endGame(currentGame);
                await handleEndOfGame(page, masterGameResult, gameResult);
                // End of game handled, break from for loop.
                break;
            }
        }
    } while(SHOULD_RESTART);
    // Complete the session and return results.
    await masterGameResult.completeSession();
    return masterGameResult;
}

exports.isWordleGameValid = isWordleGameValid;
exports.playWordle = playWordle;
