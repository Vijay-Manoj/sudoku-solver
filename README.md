# Sudoku — The Puzzle Book

A single-page Sudoku game styled like a puzzle book, with four difficulty levels, notes/pencil marks, mistake tracking, hints, and a built-in solver — no frameworks, no build step, just HTML/CSS/JS.

**[Live demo →](#)** *(enable GitHub Pages on this repo and drop the link here)*

## Features

- **Four difficulty levels** — Easy, Medium, Hard, Expert — selected via the bookmark tabs on the side of the "book." Each puzzle is generated fresh and checked to have a **unique solution**.
- **Solver built in** — hit "Solve for me" and the backtracking solver fills in the rest of the grid instantly.
- **Hints** — a limited number of hints per puzzle (fewer on harder levels) reveal one correct cell at a time.
- **Notes / pencil marks** — toggle notes mode to jot candidate numbers into a cell, 3×3 mini-grid style.
- **Live mistake checking** — wrong entries are highlighted immediately; three mistakes ends the round.
- **Row / column / box highlighting** and same-number highlighting to make scanning the grid easier.
- **Keyboard support** — arrow keys to move, number keys to fill, backspace/delete to erase.
- **Fully responsive**, works down to mobile widths, respects `prefers-reduced-motion`.

## How it works

- **Generator**: fills a full valid 9×9 grid via randomized backtracking, then removes cells one at a time (in random order), checking after each removal that the puzzle still has exactly one solution (via a capped solution-counter). This guarantees every puzzle is uniquely solvable.
- **Solver**: standard constraint-based backtracking (row/column/3×3-box validity checks) — the same routine used to both generate and solve puzzles.
- All logic runs client-side in `script.js`; there's no backend or build process.

## Project structure

```
├── index.html   # markup
├── style.css    # puzzle-book visual design
├── script.js    # generator, solver, game state, rendering
└── README.md
```

## Running locally

Just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages**.
3. Under "Build and deployment," choose **Deploy from a branch**, pick `main` and `/ (root)`.
4. Save — your site will be live at `https://<your-username>.github.io/<repo-name>/`.

## License

Free to use, modify, and share.
