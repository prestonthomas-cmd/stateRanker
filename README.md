# stateRanker

A small web app that ranks the 50 U.S. states by asking you to pick between two states, one matchup at a time.

**Live app: https://prestonthomas-cmd.github.io/stateRanker/**

## Use it

Use the live app above, or open `index.html` in a browser. There's no build step and nothing to install.

1. Choose what you're ranking by (for example "Which state would you rather live in?"). You can also include Washington, D.C.
2. Pick the winner of each matchup by clicking it, or with the ← / → keys.
3. When every state has been placed, you get your full ranking, which you can copy.

## How it works

The app uses binary insertion sort. Each new state is compared against the middle of the states already ranked, and that range is halved until the state's spot is found. Ranking all 50 states takes at most about 230 picks, compared with 1,225 for every possible pairing.

- **Undo**: U, Backspace, or the Undo button takes back your last pick.
- **Autosave**: progress is saved in your browser's localStorage, so you can close the tab and pick up where you left off.
- Which side each state appears on is random, so screen position doesn't skew your picks.
