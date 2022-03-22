const assert = require("assert");
const conf = require("./conf");
const com = require("./com");

/*
Creates a game state object and returns it.
This state object will keep track of letters played, their positions, where they could go, and perhaps
even early guesses about what the word could be.

Arguments:
:numRows: An integer indicating the number of rows in the game grid.
:numLettersPerRow: An integer indicating the number of letters in the final word/each row.
:wordList: An array of words that form the word list.
:startingWordList: An array of words that form the starting word list.

Returns:
A Game object that holds the state for the current puzzle.
*/
async function beginGame(numRows, numLettersPerRow, wordList, startingWordList) {
    console.log(`Beginning a new game of Wordle.`);
    // For the number of rows, create the required number of letters, they're all blank.
    let gameRows = [];
    for(var i = 0; i < numRows; i++) {
        let gameRow = [];
        for(var j = 0; j < numLettersPerRow; j++) {
            let gameLetter = {
                rowIndex: i,
                columnIndex: j,
                absoluteIndex: (i * numLettersPerRow) + j,
                attemptedLetter: undefined,
                positionIndicator: undefined,
                isLetterAttempted: false
            };
            gameRow.push(gameLetter);
        }
        gameRows.push(gameRow);
    }
    // Create an array for all absent letters. Whenever a character is tagged with 'letter-absent'.
    let absentLetters = [];
    /*
    Create a DICTIONARY -> DICTIONARY mapping that will keep track of how specific columns regard particular letters;
    For example, the following would be for a grid 5 characters in width (word is 5 characters long.)
        {
            0: { 'never': ['a','c','g'], 'priority': ['b','x'] }
            1: { 'home': ['x'] }
            2: {}
            3: {}
            4: {}
        }
    */
    let grandSlots = {};
    for(var x = 0; x < numLettersPerRow; x++) {
        grandSlots[x] = {
            home: undefined,
            priority: [],
            never: []
        };
    }
    /*
    Create a new dictionary to contain all words that have already been used.
    */
    let usedWords = [];
    /*
    Create a metrics dictionary to contain ongoing numerical updates on the game state, so we can make better
    decisions on what sort of words we should try/how close we are to success or failure etc.
    */
    let gameMetrics = {
        solution: undefined,
        correctLetters: [],
        numAttemptedRows: 0,                                // Number of rows that have been locked/number attempts already made.
        numCorrectLetters: 0,                               // Number of characters, out of numLettersPerRow, that are correct.
        percentCompleted: 0,                                // Percentage representing the relationship between num correct and number of letters.
        gameStartedAt: Math.floor(Date.now() / 1000),       // Timestamp when the game began.
        gameEndedAt: -1                                     // Timestamp when the game ended.
    };
    console.log(`Game created with ${numRows} rows and ${numLettersPerRow} letters per row; a ${numRows * numLettersPerRow} letter grid.`);
    var newGame = {
        allowedAlphabet: conf.ALL_ASCII,
        absentLetters: absentLetters,
        grandSlots: grandSlots,
        gameRows: gameRows,
        numRows: numRows,
        numLettersPerRow: numLettersPerRow,
        wordList: wordList,
        startingWordList: startingWordList,
        usedWords: usedWords,
        gameMetrics: gameMetrics,
        isGameSolved: false,
        isGameLost: false
    };

    /*
    Return the number of rows that have been attempted (locked in), we'll do this by counting the number rows whose
    first letter has isLetterAttempted set to true. We can trust the remainer of the letters are also locked in as
    isLetterAttempted is only given after a Row receives the .Row-locked class.
    */
    newGame.getNumAttemptedRows = async function() {
        var numAttempted = 0;
        for(var rowIndex = 0; rowIndex < this.numRows; rowIndex++) {
            if(this.gameRows [rowIndex] [0].isLetterAttempted) {
                numAttempted++;
            }
        }
        return numAttempted;
    }

    /*
    Return a dictionary on the order of letterIndex:character where character is either the correct letter
    at that index, or undefined.
    */
    newGame.getCorrectLetters = async function() {
        let correctLetters = {};
        for(var letterIndex = 0; letterIndex < this.numLettersPerRow; letterIndex++) {
            correctLetters [letterIndex] = this.grandSlots [letterIndex] ["home"];
        }
        return correctLetters;
    }

    /*
    Return a dictionary on the order of letterIndex:Array where Array contains all letters that should
    be priority for that slot.
    */
    newGame.getPriorityLetters = async function() {
        let priorityLetters = {};
        for(var letterIndex = 0; letterIndex < this.numLettersPerRow; letterIndex++) {
            priorityLetters [letterIndex] = this.grandSlots [letterIndex] ["priority"];
        }
        return priorityLetters;
    }

    /*
    Return a dictionary on the order of letterIndex:Array where Array contains all letters that must
    never appear at letterIndex.
    */
    newGame.getNeverLetters = async function() {
        let neverLetters = {};
        for(var letterIndex = 0; letterIndex < this.numLettersPerRow; letterIndex++) {
            neverLetters [letterIndex] = this.grandSlots [letterIndex] ["never"];
        }
        return neverLetters;
    }

    newGame.isLetterCorrect = async function(letter) {
        for(var x = 0; x < this.numLettersPerRow; x++) {
            if(this.grandSlots [x] ["home"] !== undefined && this.grandSlots [x] ["home"] == letter) {
                return true;
            }
        }
        return false;
    }
    return newGame;
}

/*
Finish the given game instance and return a GameResult object.

Arguments:
:currentGame: The game instance to finish.

Returns:
A GameResult, describing how this game went.
*/
async function endGame(currentGame) {
    // Set the game ended timestamp.
    currentGame.gameMetrics.gameEndedAt = Math.floor(Date.now() / 1000);
    // Calculate duration.
    let gameDuration = currentGame.gameMetrics.gameEndedAt - currentGame.gameMetrics.gameStartedAt;
    // Grab each attempted word for each row.
    let attemptedRows = [];
    for(var rowIndex = 0; rowIndex < currentGame.gameRows.length; rowIndex++) {
        var correct = 0;
        var elsewhere = 0;
        var absent = 0;

        // Make an array of each letter in each index.
        let wordArray = Array(currentGame.numLettersPerRow).fill("");
        for(var letterIndex = 0; letterIndex < currentGame.numLettersPerRow; letterIndex++) {
            let letter = currentGame.gameRows [rowIndex] [letterIndex];
            if(letter.attemptedLetter !== undefined) {
                wordArray [letterIndex] = letter.attemptedLetter;
                // Also for each letter, increment the row's success rates per letter.
                switch(letter.positionIndicator) {
                    case "letter-correct":
                        correct++;
                        break;

                    case "letter-elsewhere":
                        elsewhere++;
                        break;

                    case "letter-absent":
                        absent++;
                        break;
                }
            }
        }

        attemptedRows.push({
            rowIndex: rowIndex,
            attemptedWord: wordArray.join(""),
            numCorrect: correct,
            numElsewhere: elsewhere,
            numAbsent: absent
        });
    }

    return {
        solution: currentGame.gameMetrics.solution,
        rows: attemptedRows,
        numRowsUsed: currentGame.gameMetrics.numAttemptedRows,
        numRows: currentGame.numRows,
        numLettersPerRow: currentGame.numLettersPerRow,

        gameStartedAt: currentGame.gameMetrics.gameStartedAt,
        gameEndedAt: currentGame.gameMetrics.gameEndedAt,
        gameDuration: gameDuration,

        isGameSolved: currentGame.isGameSolved,
        isGameLost: currentGame.isGameLost
    }
}

/*
Called after a word has been attempted, locked in and results for it read. This function will improve the future suggestions for words by
setting correct letters, blacklisting absent letters and prioritising elsewhere letters where applicable.
The basic rules are;
    1. If a letter is absent, it isn't anywhere in the word; add it to absentLetters.
    2. If a letter is elsewhere, it is somewhere ELSE in the word;
        -> It must be added to grandSlots as 'never' under itself.
        -> It must be added to grandSlots as 'priority' under other. (unless it already exists under 'never' or 'priority' within other)
    3. If a letter is correct, it is correct in the position it's currently in;
        -> It must be added to grandSlots as 'home' under itself.

Arguments:
:currentGame: Our state object.
:word: The attempted word.
:equivalentGameRow: The row from Game::gameRows equivalent to the latest attempt's row.

Returns:
--
*/
async function updateLetterMemory(currentGame, word, equivalentGameRow) {
    console.log(`Committing word '${word}' to letter memory...`);
    for(var letterIndex = 0; letterIndex < equivalentGameRow.length; letterIndex++) {
        let letter = equivalentGameRow[letterIndex];
        switch(letter.positionIndicator) {
            case "letter-correct":
                console.log(`Letter at index ${letterIndex} (${letter.attemptedLetter}) for attempted word ${word} is CORRECT, set as HOME under slot index ${letterIndex}!`);
                currentGame.grandSlots [letterIndex] ["home"] = letter.attemptedLetter;
                break;

            case "letter-elsewhere":
                // This letter is elsewhere.
                console.log(`Letter at index ${letterIndex} (${letter.attemptedLetter}) for attempted word ${word} is ELSEWHERE! Blacklisting it from ever appearing in slot index ${letterIndex}`);
                // If this letter isn't already in 'never' at this index, add it.
                if(!currentGame.grandSlots [letterIndex] ["never"].includes(letter.attemptedLetter)) {
                    currentGame.grandSlots [letterIndex] ["never"].push(letter.attemptedLetter);
                }
                // If this letter is in 'priority' at this index, remove it.
                if(currentGame.grandSlots [letterIndex] ["priority"].includes(letter.attemptedLetter)) {
                    currentGame.grandSlots [letterIndex] ["priority"].splice(
                        currentGame.grandSlots [letterIndex] ["priority"].indexOf(letter.attemptedLetter),
                        1
                    )
                }
                // Now, add this letter as PRIORITY to all other slots, unless it is already in 'never' for that slot.
                for(let grandSlotIndex of Object.keys(currentGame.grandSlots)) {
                    if(currentGame.grandSlots[ grandSlotIndex ] ["never"].includes(letter.attemptedLetter)) {
                        // Letter is in 'never' for this slot; skip.
                        continue;
                    }
                    console.log(`\t(${letter.attemptedLetter}) at index ${letterIndex} added as PRIORITY to slot index ${grandSlotIndex}`);
                    if(!currentGame.grandSlots [grandSlotIndex] ["priority"].includes(letter.attemptedLetter)) {
                        currentGame.grandSlots [grandSlotIndex] ["priority"].push(letter.attemptedLetter);
                    }
                }
                break;

            case "letter-absent":
                // Letter is totally absent from the word. Add to blacklisted letters.
                if(!currentGame.absentLetters.includes(letter.attemptedLetter) && !(await currentGame.isLetterCorrect(letter.attemptedLetter))) {
                    console.log(`Letter at index ${letterIndex} (${letter.attemptedLetter}) for attempted word ${word} is ABSENT! Blacklisting it from ever appearing at all.`);
                    currentGame.absentLetters.push(letter.attemptedLetter);
                }
                break;
        }
    }
}

/*
Post wordAttempted, performs calculations for ongoing analytical data about the game.
Results are posted to the given currentGame.
*/
async function updateGameMetrics(currentGame) {
    currentGame.gameMetrics.numAttemptedRows = await currentGame.getNumAttemptedRows();
    let correctLetters = [];
    let correctLetterDict = await currentGame.getCorrectLetters();
    for(var x = 0; x < currentGame.numLettersPerRow; x++) {
        if(correctLetterDict [x] !== undefined) {
            correctLetters.push(correctLetterDict [x]);
        }
    }
    currentGame.gameMetrics.correctLetters = correctLetters;
    currentGame.gameMetrics.numCorrectLetters = correctLetters.length;
    currentGame.gameMetrics.percentCompleted = Math.round((correctLetters.length / currentGame.numLettersPerRow) * 100);
}

async function getAllowedAlphabet(currentGame) {
    // Now, create an array from ALL_ASCII, but remove all absent characters.
    return conf.ALL_ASCII.filter(alphabetLetter => !(currentGame.absentLetters.includes(alphabetLetter)));
}

/*
Called when puppeteer attempts a word and reads the response. This function will add the response
to the given state; which will update ongoing information/guesses on the next word.

Arguments:
:currentGame: Our Game object.
:word: The word, in lowercase ASCII, that was just attempted.
:attemptedRowState: The result of data::makeRowState(), a RowState describing the latest row, procured after the word was attempted.

Returns:
The current Game object.
*/
async function wordAttempted(currentGame, word, attemptedRowState) {
    console.log(`Word '${word}' has been attempted. Processing state...`);
    // First, we're going to map the attempted row state to our existing internal map.
    // Find the equivalent row in our current game state.
    let equivalentGameRow = currentGame.gameRows [attemptedRowState.rowIndex];
    // Now, for each character in the given row state, update the equivalent row state in current game's state.
    var updatedRowStatString = "";
    for(var i = 0; i < attemptedRowState.numberOfLetters; i++) {
        let letterToUpdate = equivalentGameRow[i];
        let letterToUpdateFrom = attemptedRowState.letters[i];
        // Assert this is the same absolute letter.
        assert(letterToUpdate.absoluteIndex == letterToUpdateFrom.absoluteIndex);
        // Now update its data.
        letterToUpdate.attemptedLetter = letterToUpdateFrom.attemptedLetter;
        letterToUpdate.isLetterAttempted = letterToUpdateFrom.isLetterAttempted;
        letterToUpdate.positionIndicator = letterToUpdateFrom.positionIndicator;
        updatedRowStatString += `\tRow ${attemptedRowState.rowIndex}, letter ${i} in current state updated to match; attemptedLetter=${letterToUpdateFrom.attemptedLetter}, isLetterAttempted=${letterToUpdateFrom.isLetterAttempted}, positionIndicator=${letterToUpdateFrom.positionIndicator}\n`;
    }
    console.log(`Updated row:\n${updatedRowStatString}`);
    // Add this word to used words.
    /* TODO: instance function */
    currentGame.usedWords.push(word);
    if(currentGame.wordList.includes(word)) {
        currentGame.wordList.splice(currentGame.wordList.indexOf(word), 1);
    }
    // Now that's done, let's update the letters we can use/absent letters.
    let result = await updateLetterMemory(currentGame, word, equivalentGameRow);
    // Finally, we'll update our allowed alpahabet.
    let allowedAlphabet = await getAllowedAlphabet(currentGame);
    currentGame.allowedAlphabet = allowedAlphabet;
    // Update game metrics.
    await updateGameMetrics(currentGame);
    // If number of correct letters is equal to number of letters per row, we solved the puzzle and wordle accepted it!
    if(currentGame.gameMetrics.numCorrectLetters == currentGame.numLettersPerRow) {
        console.log(`Success! We have solved the current puzzle!`);
        currentGame.gameMetrics.solution = word;
        currentGame.isGameSolved = true;
    } else if(currentGame.gameMetrics.numCorrectLetters < currentGame.numLettersPerRow && currentGame.gameMetrics.numAttemptedRows == currentGame.numRows) {
        // If number of correct letters is less than number of letters per row and number of attempted rows is equal to number of rows, we've failed.
        console.log(`Failed! We ran out of rows... Needs more work :(`);
        currentGame.isGameLost = true;
    }
    // Return current game instance.
    return currentGame;
}

/*
Called when Wordle does not accept a word. Simply adds the word to usedWords.

Arguments:
:currentGame: Our Game instance.
:word: The word not accepted.

Returns:
--
*/
async function wordNotAccepted(currentGame, word) {
    console.log(`Word ${word} is not accepted. Adding it to used words.`);
    currentGame.usedWords.push(word);
}

/*
Constructs a regular expression that matches any word EXCEPT one that satisfies the following criteria:
    -> Any word where the letter at a given index is present in the equivalent array given by neverLetters,
    -> Any word where the letter at a given index is present in the absentLetters, unless the letter is in that given index under 'correct' letters or 'priority'.

Arguments:
:correctLetters: A dictionary of letterIndex:character in which each correct letter is set, otherwise undefined.
:priorityLetters: A dictionary of letterIndex:Array in which all items in the array should be priority at the given index.
:neverLetters: A dictionary of letterIndex:Array in which all items in the array must never be found in the given letter index.
:absentLetters: An array of all the letters not allowed to appear anywhere in the word.
:numLettersPerRow: Integer, the length of the final word.

Returns:
A regular expression, numLettersPerRow long, that can be used to match all words EXCEPT those that must be removed.
*/
async function getBlacklistWordRegExp(correctLetters, priorityLetters, neverLetters, absentLetters, numLettersPerRow) {
    var regexArray = Array(numLettersPerRow).fill(null);
    for(var letterIndex = 0; letterIndex < numLettersPerRow; letterIndex++) {
        let correct = correctLetters [letterIndex];
        let priority = priorityLetters [letterIndex];
        let never = neverLetters [letterIndex];
        // Construct a negative group match, consiting of all never letters and absent letters for this letter index.
        // If there are no never letters and no absent letters, set this point to a wild character.
        if(never.length == 0 && absentLetters.length == 0) {
            regexArray [letterIndex] = "\\w";
            continue;
        }
        var negativeGroupInternals = "";
        // If we have absent letters, join them and add to negative group.
        if(absentLetters.length > 0) {
            // Filter absent letters, removing any letter that is also equal to 'correct' for this letter index.
            let filteredAbsentLetters = absentLetters.filter((letter) => {
                if((correct !== undefined && letter == correct) || priority.includes(letter)) {
                    return false;
                }
                return true;
            });
            negativeGroupInternals += filteredAbsentLetters.join("");
        }
        // Same with never.
        if(never.length > 0) {
            negativeGroupInternals += never.join("");
        }
        // Now set filter array to the negative group match.
        regexArray [letterIndex] = `[^${negativeGroupInternals}]`;
    }
    return new RegExp(regexArray.join(""));
}

async function getBlacklistWordRegExpFromGame(currentGame) {
    let correctLetters = await currentGame.getCorrectLetters();
    let priorityLetters = await currentGame.getPriorityLetters();
    let neverLetters = await currentGame.getNeverLetters();
    return await getBlacklistWordRegExp(correctLetters, priorityLetters, neverLetters, currentGame.absentLetters, currentGame.numLettersPerRow);
}

/*
Construct a regular expression that matches any word, to the length of numLettersPerRow, that satifies the following functions:
    -> Where a slot has a CORRECT letter, that is occupied by a character match,
    -> Where a slot has priority letters, they are appended to the front of a group match,
    -> Currently allowed alphabet is filtered to remove any character already in priority letters, then appended to the group match for that slot.
    -> Wild character match everywhere else. (Not necessary)

Arguments:
:correctLetters: A dictionary of letterIndex:character in which each correct letter is set, otherwise undefined.
:priorityLetters: A dictionary of letterIndex:Array in which all items in the array should be priority at the given index.
:allowedAlphabet: An array of letters that aren't absent from the word.
:numLettersPerRow: Integer, the length of the final word.

Returns:
A regular expression, numLettersPerRow long, that can be used to match all proposed next words.
*/
async function getWhitelistWordRegExp(correctLetters, priorityLetters, allowedAlphabet, numLettersPerRow) {
    var regexArray = Array(numLettersPerRow).fill(null);
    for(var letterIndex = 0; letterIndex < numLettersPerRow; letterIndex++) {
        // Set correct letter, if applicable.
        if(correctLetters [letterIndex] !== undefined) {
            regexArray [letterIndex] = correctLetters [letterIndex];
            continue;
        }
        // Set priority & allowed alphabet letters.
        let priority = priorityLetters [letterIndex];
        // If there are 0 priority items, and allowedAlphabet is to the length of conf::ASCII, just use a wild character match.
        if(priority.length == 0 && allowedAlphabet.length == conf.ALL_ASCII.length) {
            regexArray [letterIndex] = "\\w";
            continue;
        }
        var priorityFilter = priority.join("|");
        if(priority.length > 0) {
            priorityFilter += "|";
        }
        // Otherwise, use priority letters, explicitly concatenated to the allowed alphabet.
        // Remove all letters from the allowed alphabet that also appear in the priority array for this slot.
        let filteredAllowedAlphabet = allowedAlphabet.filter((letter) => {
            if(priority.includes(letter)) {
                return false;
            }
            return true;
        });
        // Create a non-matching group to contain this group match, set it, concatenating priority letters & allowed alphabet.
        regexArray [letterIndex] = `(?:[${priorityFilter}${filteredAllowedAlphabet.join("")}])`;
    }
    return new RegExp(regexArray.join(""));
}

async function getWhitelistWordRegExpFromGame(currentGame) {
    let correctLetters = await currentGame.getCorrectLetters();
    let priorityLetters = await currentGame.getPriorityLetters();
    return await getWhitelistWordRegExp(correctLetters, priorityLetters, currentGame.allowedAlphabet, currentGame.numLettersPerRow);
}

/*
Filters the given proposed words, by ensuring that each word contains every given priority letter at least once.

Arguments:
:usedWords: An array of words already in use by the game.
:priorityLetters: An array of all priority letters from each letter index.
:proposedWords: An array of all proposed words to filter.

Returns:
An array of filtered proposed words.
*/
async function filterUselessWords(usedWords, priorityLetters, proposedWords) {
    return proposedWords.filter((word) => {
        if(usedWords.includes(word)) {
            return false;
        }
        for(letter of priorityLetters) {
            if(!word.includes(letter)) {
                return false;
            }
        }
        return true;
    });
}

async function filterUselessWordsWithGame(currentGame, proposedWords) {
    var priorityLetters = [];
    for(var x = 0; x < currentGame.numLettersPerRow; x++) {
        priorityLetters = priorityLetters.concat(currentGame.grandSlots [x] ["priority"]);
    }
    return await filterUselessWords(currentGame.usedWords, priorityLetters, proposedWords);
}

/*
Called when puppeteer wishes to attempt another word.
If this is a blank game, return a starting word.

This function will take into account the data given by currentGame in the following way:
    -> If 'home' is present in any entries within currentGame::grandSlots, put its (only) value into that position in finalWord; this will no longer change.
    -> Build a blacklist regular expression that consists of all letters never allowed at each index of the proposed word, and filter current game's wordlist, removing all matches.
    -> Build a whitelist regular expression that consists of all letters CORRECT, priority and allowed letters from the alphabet. Filter current game's wordlist, setting a the wordlist to equal this result.
    ->
*/
async function getNextWordToAttempt(currentGame) {
    // Check our number of attemped rows.
    if(currentGame.gameMetrics.numAttemptedRows == 0) {
        // Use a random starting word, not already in usedWords.
        let allowedStartingWords = currentGame.startingWordList.filter((starting) => {
            if(currentGame.usedWords.includes(starting)) {
                return false;
            }
            return true;
        });

        let startingWord = allowedStartingWords[com.getRandomInt(allowedStartingWords.length)];
        console.log(`Game (${currentGame.gameMetrics.percentCompleted}% completed, ${currentGame.gameMetrics.numCorrectLetters} correct) with ${currentGame.gameMetrics.numAttemptedRows} attempted words is eligible for a starting word. Using '${startingWord}'`);
        return startingWord;
    }

    // Otherwise, we can play the game properly.
    // First, construct a blacklist regular expression and locate all words that still satisfy the blacklist criteria. This will become the new word list.
    let blacklistRegex = await getBlacklistWordRegExpFromGame(currentGame);
    let wordsToRemove = [];
    let revisedWordlist = currentGame.wordList.filter((word) => {
        if(blacklistRegex.test(word)) {
            return true;
        }
        wordsToRemove.push(word);
        return false;
    });
    console.log(`Using blacklist regex ${blacklistRegex}, we located ${currentGame.wordList.length-revisedWordlist.length} words to remove:\n${(wordsToRemove.length > 100 ? "-" : wordsToRemove)}`);
    currentGame.wordList = revisedWordlist;

    // Next, construct a whitelist regular expression and locate all matching words from the current word list.
    let whitelistRegex = await getWhitelistWordRegExpFromGame(currentGame);
    var proposedWords = currentGame.wordList.filter((word) => {
        if(whitelistRegex.test(word)) {
            return true;
        }
        return false;
    });
    console.log(`Using whitelist regex ${whitelistRegex}, we located ${proposedWords.length} proposed words:\n${(proposedWords.length > 100 ? "-" : proposedWords)}`);

    if(proposedWords.length > 1) {
        // If there are multiple, this word list becomes our new word list. We'll also ensure that ALL letters in the entire 'priority' field
        // (across all letter indicies) have been used at least once. Also, this will filter any words that are already used.
        console.log(`There are multiple proposed words. Filtering all words that do not contain each entry in 'priority' at least once for every letter index...`);
        let newProposedWords = await filterUselessWordsWithGame(currentGame, proposedWords);
        console.log(`Filtered proposed words down to ${newProposedWords.length} words from ${proposedWords.length} words.`);
        proposedWords = newProposedWords;
    }

    // If there are 0 items in this list, throw an error. If there is 1 item, return it, completing the puzzle.
    if(proposedWords.length == 0) {
        console.log(`Failed to solve the puzzle. Our wordlist was reduced to 0.`);
        throw {
            name: "PuzzleFailed",
            message: "Couldn't solve the puzzle - our wordlist was reduced to 0."
        };
    } else if(proposedWords.length == 1) {
        console.log(`Successfully found solution to puzzle: ${proposedWords[0]}`);
        currentGame.wordList = proposedWords;
        return proposedWords[0];
    }

    // Otherwise, if there are multiple STILL, select a random one.
    console.log(`There's still multiple proposed words - choosing a random one.`);
    currentGame.wordList = proposedWords;
    let selectedWord = proposedWords[com.getRandomInt(proposedWords.length)];
    return selectedWord;
}

exports.beginGame = beginGame;
exports.endGame = endGame;
exports.wordAttempted = wordAttempted;
exports.wordNotAccepted = wordNotAccepted;
exports.getNextWordToAttempt = getNextWordToAttempt;
exports.getAllowedAlphabet = getAllowedAlphabet;

exports.getBlacklistWordRegExp = getBlacklistWordRegExp;
exports.getWhitelistWordRegExp = getWhitelistWordRegExp;
exports.filterUselessWords = filterUselessWords;
