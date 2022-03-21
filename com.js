const fs = require("fs").promises;

/*
Cool one liner.
https://stackoverflow.com/a/57708635
*/
const fileExists = async path => !!(await fs.stat(path).catch(e => false));

/*
Returns a random int between 0 and max.
*/
function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

exports.fileExists = fileExists;
exports.getRandomInt = getRandomInt;
