# kickeria

A web-app for shuffling teams for a foosball tournament.

Kickeria uses a firebase backend. You need to set a URL to your own firebase in the [script.js](https://github.com/trykyn/kickeria/blob/master/script.js#L44) in order to use this app.

The matchmaking is based on [trueskill™](https://www.microsoft.com/en-us/research/project/trueskill-ranking-system/).

## Features:

* Add player
* Mark players as inactive (if they have already left/on smoking break)
* Shuffle new game
* Matchmaking
* Track scores
* Compute trueskills
* Leaderboard based on trueskill or win percentage
* Additional statistics
* Betting quotes
* Win probabilities (based on trueskill)
