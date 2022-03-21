const ConsoleGrid = require("console-grid");

describe("printResultsToGrid", () => {
    it("should print a proper session result table", async () => {
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
            rows: [{
                    game_no: "Game #1",
                    outcome: "Solved",
                    solution: "flame",
                    duration: 6,
                    used_rows: "3/6"
                }, {
                    game_no: "Game #2",
                    outcome: "Solved",
                    solution: "space",
                    duration: 6,
                    used_rows: "3/6"
                }, {
                    game_no: "Game #3",
                    outcome: "Solved",
                    solution: "brain",
                    duration: 6,
                    used_rows: "4/6"
                }]
        };
        var lines = grid.render(data);
        //console.log(lines);
    });
});
