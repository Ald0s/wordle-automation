# **Wordle Automation**
A small NodeJS app that can automatically solve Wordle puzzles, using regular expression.

#### Features
* Uses Puppeteer to interact with Wordle,
* Automatically changes settings based on configuration,
* Supports multiple word lengths,
* Supports backspacing and retrying words.

#### How to use
```
# Clone the repo.

# Install packages
npm install

# Run tests
http-server ./testhtml
npm test

# Run app
node index.js
```

#### Configuration
All configuration can be found in [conf.js](conf.js)

#### What can be improved
* Words that have multiple results with only a single character missing (?ound -> round, pound, mound, wound) can exhaust rows before being solved.
* Occasionally, Wordle requires words that aren't on the word list.

#### Examples
##### Session One - 5 letter words
```
Session finished. Results:
Games played: 20
Success percentage: 95%
┌──────────┬────────────┬──────────┬──────────────┬───────────┐
│ Game #   │ Outcome    │ Solution │ Duration (s) │ Used Rows │
├──────────┼────────────┼──────────┼──────────────┼───────────┤
│ Game #1  │ Solved     │ waist    │ 10           │ 4/6       │  
│ Game #2  │ Solved     │ choir    │ 8            │ 3/6       │  
│ Game #3  │ Solved     │ broad    │ 8            │ 3/6       │  
│ Game #4  │ Solved     │ ovary    │ 11           │ 4/6       │  
│ Game #5  │ Failed     │ -        │ 16           │ 6/6       │  
│ Game #6  │ Solved     │ novel    │ 10           │ 4/6       │  
│ Game #7  │ Solved     │ feast    │ 13           │ 5/6       │  
│ Game #8  │ Solved     │ doing    │ 8            │ 3/6       │  
│ Game #9  │ Solved     │ light    │ 11           │ 4/6       │  
│ Game #10 │ Solved     │ sound    │ 15           │ 6/6       │  
│ Game #11 │ Solved     │ alert    │ 11           │ 4/6       │  
│ Game #12 │ Solved     │ guest    │ 11           │ 4/6       │  
│ Game #13 │ Solved     │ vinyl    │ 9            │ 3/6       │  
│ Game #14 │ Solved     │ bride    │ 13           │ 5/6       │  
│ Game #15 │ Solved     │ piece    │ 11           │ 4/6       │  
│ Game #16 │ Solved     │ jewel    │ 8            │ 3/6       │  
│ Game #17 │ Solved     │ twins    │ 15           │ 6/6       │  
│ Game #18 │ Solved     │ slope    │ 16           │ 6/6       │  
│ Game #19 │ Solved     │ plant    │ 11           │ 4/6       │
│ Game #20 │ Solved     │ short    │ 11           │ 4/6       │
└──────────┴────────────┴──────────┴──────────────┴───────────┘
```  

##### Session Two - 11 letter words
```
Session finished. Results:
Games played: 20
Success percentage: 100%
┌──────────┬────────────┬─────────────┬──────────────┬───────────┐
│ Game #   │ Outcome    │ Solution    │ Duration (s) │ Used Rows │
├──────────┼────────────┼─────────────┼──────────────┼───────────┤
│ Game #1  │ Solved     │ spokeswoman │ 12           │ 3/6       │
│ Game #2  │ Solved     │ preparation │ 11           │ 4/6       │
│ Game #3  │ Solved     │ secretariat │ 16           │ 4/6       │
│ Game #4  │ Solved     │ supervision │ 9            │ 3/6       │
│ Game #5  │ Solved     │ hydrocarbon │ 14           │ 3/6       │
│ Game #6  │ Solved     │ frustration │ 8            │ 3/6       │
│ Game #7  │ Solved     │ grandmother │ 16           │ 4/6       │
│ Game #8  │ Solved     │ restriction │ 11           │ 4/6       │
│ Game #9  │ Solved     │ certificate │ 17           │ 4/6       │
│ Game #10 │ Solved     │ harpsichord │ 6            │ 2/6       │
│ Game #11 │ Solved     │ grasshopper │ 27           │ 3/6       │
│ Game #12 │ Solved     │ alternative │ 20           │ 4/6       │
│ Game #13 │ Solved     │ convenience │ 8            │ 3/6       │
│ Game #14 │ Solved     │ commonsense │ 16           │ 3/6       │
│ Game #15 │ Solved     │ wastebasket │ 6            │ 2/6       │
│ Game #16 │ Solved     │ thermometer │ 11           │ 3/6       │
│ Game #17 │ Solved     │ incarnation │ 14           │ 3/6       │
│ Game #18 │ Solved     │ wastebasket │ 8            │ 3/6       │
│ Game #19 │ Solved     │ grandmother │ 8            │ 3/6       │
│ Game #20 │ Solved     │ engineering │ 11           │ 4/6       │
└──────────┴────────────┴─────────────┴──────────────┴───────────┘
```
