const data = require("../data");

describe("makeKeyboardKeyState", () => {
    it("should correct convert a button info with an indicator", async () => {
        let gameKeyboardButtonInfoWithIndicator = {
            innerKey: "q",
            buttonClass: "Game-keyboard-button letter-elsewhere"
        };
        let gameKeyboardKeyState = await data.makeKeyboardKeyState(gameKeyboardButtonInfoWithIndicator.innerKey, gameKeyboardButtonInfoWithIndicator.buttonClass);
        expect(gameKeyboardKeyState.key).toBe("q");
        expect(gameKeyboardKeyState.positionIndicator).toBe("letter-elsewhere");

        let rowLetterButtonInfoWithIndicator = {
            innerKey: "q",
            buttonClass: "Row-letter letter-elsewhere"
        };
        let rowLetterKeyState = await data.makeKeyboardKeyState(rowLetterButtonInfoWithIndicator.innerKey, rowLetterButtonInfoWithIndicator.buttonClass);
        expect(rowLetterKeyState.key).toBe("q");
        expect(rowLetterKeyState.positionIndicator).toBe("letter-elsewhere");
    });

    it("should correct convert a button info without an indicator", async () => {
        let gameKeyboardButtonInfoWithoutIndicator = {
            innerKey: "q",
            buttonClass: "Game-keyboard-button"
        };
        let gameKeyboardKeyState = await data.makeKeyboardKeyState(gameKeyboardButtonInfoWithoutIndicator.innerKey, gameKeyboardButtonInfoWithoutIndicator.buttonClass);
        expect(gameKeyboardKeyState.key).toBe("q");
        expect(gameKeyboardKeyState.positionIndicator).toBe("");

        let rowLetterButtonInfoWithoutIndicator = {
            innerKey: "q",
            buttonClass: "Row-letter"
        };
        let rowLetterKeyState = await data.makeKeyboardKeyState(rowLetterButtonInfoWithoutIndicator.innerKey, rowLetterButtonInfoWithoutIndicator.buttonClass);
        expect(rowLetterKeyState.key).toBe("q");
        expect(rowLetterKeyState.positionIndicator).toBe("");
    });
});

describe("extractKeysWithIndicator", () => {
    it("should correctly extract keys with the requested indicator.", async () => {
        let keyStates = {
            a: {
                key: "a",
                positionIndicator: "letter-absent",
                handle: undefined
            },
            b: {
                key: "b",
                positionIndicator: "letter-absent",
                handle: undefined
            },
            c: {
                key: "c",
                positionIndicator: "letter-correct",
                handle: undefined
            },
            d: {
                key: "d",
                positionIndicator: "letter-elsewhere",
                handle: undefined
            },
            e: {
                key: "e",
                positionIndicator: "letter-absent",
                handle: undefined
            },
        };

        let absentLetters = await data.extractKeysWithIndicator(keyStates, "letter-absent");
        let elsewhereLetters = await data.extractKeysWithIndicator(keyStates, "letter-elsewhere");
        let correctLetters = await data.extractKeysWithIndicator(keyStates, "letter-correct");

        expect(Object.entries(absentLetters).length).toBe(3);
        expect(Object.entries(elsewhereLetters).length).toBe(1);
        expect(Object.entries(correctLetters).length).toBe(1);
    });
});

describe("makeLetterState", () => {
    it("should handle a grid letter with attempted key.", async () => {
        let gridLetterWithAttemptedKey = {
            innerKey: "q",
            buttonClass: "Row-letter letter-elsewhere"
        };
        let letterState = await data.makeLetterState(gridLetterWithAttemptedKey.innerKey, gridLetterWithAttemptedKey.buttonClass);
        expect(letterState.attemptedLetter).toBe("q");
        expect(letterState.isLetterAttempted).toBe(true);
        expect(letterState.positionIndicator).toBe("letter-elsewhere");
    });

    it("should handle a grid letter without attempted key.", async () => {
        let gridLetterWithoutAttemptedKey = {
            innerKey: "",
            buttonClass: "Row-letter"
        };
        let letterState = await data.makeLetterState(gridLetterWithoutAttemptedKey.innerKey, gridLetterWithoutAttemptedKey.buttonClass);
        expect(letterState.attemptedLetter).toBe("");
        expect(letterState.isLetterAttempted).toBe(false);
        expect(letterState.positionIndicator).toBe(undefined);
    });
});

describe("makeLetterState", () => {
    it("should handle a grid letter with attempted key.", async () => {
        let gridLetterWithAttemptedKey = {
            innerKey: "q",
            buttonClass: "Row-letter letter-elsewhere"
        };
        let letterState = await data.makeLetterState(gridLetterWithAttemptedKey.innerKey, gridLetterWithAttemptedKey.buttonClass);
        expect(letterState.attemptedLetter).toBe("q");
        expect(letterState.isSelected).toBe(false);
        expect(letterState.isLetterAttempted).toBe(true);
        expect(letterState.positionIndicator).toBe("letter-elsewhere");
    });

    it("should handle a grid letter without attempted key.", async () => {
        let gridLetterWithoutAttemptedKey = {
            innerKey: "",
            buttonClass: "Row-letter"
        };
        let letterState = await data.makeLetterState(gridLetterWithoutAttemptedKey.innerKey, gridLetterWithoutAttemptedKey.buttonClass);
        expect(letterState.attemptedLetter).toBe("");
        expect(letterState.isSelected).toBe(false);
        expect(letterState.isLetterAttempted).toBe(false);
        expect(letterState.positionIndicator).toBe(undefined);
    });

    it("should handle a grid letter without attempted key.", async () => {
        let gridLetterWithoutAttemptedKey = {
            innerKey: "",
            buttonClass: "Row-letter selected"
        };
        let letterState = await data.makeLetterState(gridLetterWithoutAttemptedKey.innerKey, gridLetterWithoutAttemptedKey.buttonClass);
        expect(letterState.attemptedLetter).toBe("");
        expect(letterState.isSelected).toBe(true);
        expect(letterState.isLetterAttempted).toBe(false);
        expect(letterState.positionIndicator).toBe(undefined);
    });
});
