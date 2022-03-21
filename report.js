const ConsoleGrid = require("console-grid");

async function printResultsToGrid(masterGameResult) {
    let rows = [];
    for(var gameIndex = 0; gameIndex < masterGameResult.games.length; gameIndex++) {
        let game = masterGameResult.games [gameIndex];
        rows.push({
            game_no: `Game #${gameIndex+1}`,
            outcome: (game.isGameSolved) ? `Solved` : `Failed`,
            solution: (game.isGameSolved) ? game.solution : `-`,
            duration: game.gameDuration,
            used_rows: `${game.numRowsUsed}/${game.numRows}`
        });
    }

    var grid = new ConsoleGrid();
    var data = {
        option: {
            sortField: "game_no",
            sortAsc: true,
            treeId: "game_no"
        },
        columns: [{
                id: "game_no",
                name: "Game #",
                type: "string",
                maxWidth: 20
            }, {
                id: "outcome",
                name: "Outcome",
                type: "string",
                maxWidth: 30,
                minWidth: 10
            }, {
                id: "solution",
                name: "Solution",
                type: "string",
                maxWidth: 15,
                minWidth: 5
            }, {
                id: "duration",
                name: "Duration (s)",
                type: "string",
                maxWidth: 15,
                minWidth: 4
            }, {
                id: "used_rows",
                name: "Used Rows",
                type: "string",
                maxWidth: 15,
                minWidth: 5
            }],
        rows: rows
    };
    var lines = grid.render(data);
}

exports.printResultsToGrid = printResultsToGrid;
