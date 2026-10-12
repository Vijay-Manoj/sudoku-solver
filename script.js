(() => {
  'use strict';

  /* ============ Core Sudoku engine ============ */

  const emptyGrid = () => Array.from({ length: 9 }, () => Array(9).fill(0));

  function isValid(grid, row, col, num) {
    for (let x = 0; x < 9; x++) {
      if (grid[row][x] === num) return false;
      if (grid[x][col] === num) return false;
    }
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[startRow + i][startCol + j] === num) return false;
      }
    }
    return true;
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function fillGrid(grid) {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const num of nums) {
            if (isValid(grid, row, col, num)) {
              grid[row][col] = num;
              if (fillGrid(grid)) return true;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  // Counts solutions up to `cap` (used to confirm a puzzle stays uniquely solvable)
  function countSolutions(grid, cap) {
    let count = 0;
    function backtrack() {
      if (count >= cap) return;
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (grid[row][col] === 0) {
            for (let num = 1; num <= 9; num++) {
              if (count >= cap) return;
              if (isValid(grid, row, col, num)) {
                grid[row][col] = num;
                backtrack();
                grid[row][col] = 0;
              }
            }
            return;
          }
        }
      }
      count++;
    }
    backtrack();
    return count;
  }

  function solveGrid(grid) {
    const copy = grid.map((r) => r.slice());
    function backtrack() {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (copy[row][col] === 0) {
            for (let num = 1; num <= 9; num++) {
              if (isValid(copy, row, col, num)) {
                copy[row][col] = num;
                if (backtrack()) return true;
                copy[row][col] = 0;
              }
            }
            return false;
          }
        }
      }
      return true;
    }
    return backtrack() ? copy : null;
  }

  const DIFFICULTY = {
    easy: { clues: 40, hints: 5, label: 'Easy' },
    medium: { clues: 33, hints: 4, label: 'Medium' },
    hard: { clues: 28, hints: 3, label: 'Hard' },
    expert: { clues: 24, hints: 2, label: 'Expert' },
  };

  function generatePuzzle(clues) {
    const solution = emptyGrid();
    fillGrid(solution);
    const puzzle = solution.map((r) => r.slice());

    const positions = [];
    for (let r = 0; r < 9; r++) for (let c = 0; c < 9; c++) positions.push([r, c]);
    shuffle(positions);

    let removed = 0;
    const targetRemovals = 81 - clues;

    for (const [r, c] of positions) {
      if (removed >= targetRemovals) break;
      const backup = puzzle[r][c];
      puzzle[r][c] = 0;
      const testGrid = puzzle.map((row) => row.slice());
      const solutions = countSolutions(testGrid, 2);
      if (solutions === 1) {
        removed++;
      } else {
        puzzle[r][c] = backup;
      }
    }
    return { puzzle, solution };
  }

  /* ============ Game state ============ */

  const state = {
    level: 'easy',
    puzzle: null,      // 9x9, 0 = empty, given cells fixed
    solution: null,    // 9x9 fully solved
    given: null,       // 9x9 boolean, true = original clue
    board: null,       // 9x9 current values (given + user entries)
    notes: null,       // 9x9 -> Set of candidate numbers
    selected: null,    // [row, col]
    notesMode: false,
    mistakes: 0,
    maxMistakes: 3,
    hintsLeft: 3,
    timerSeconds: 0,
    timerHandle: null,
    solved: false,
    gameOver: false,
    puzzleNumber: Math.floor(Math.random() * 900) + 100,
  };

  /* ============ DOM refs ============ */

  const gridEl = document.getElementById('grid');
  const numpadEl = document.getElementById('numpad');
  const timerEl = document.getElementById('timer');
  const mistakesEl = document.getElementById('mistakes');
  const hintsLeftEl = document.getElementById('hintsLeft');
  const levelLabelEl = document.getElementById('levelLabel');
  const stampEl = document.getElementById('stamp');
  const messageEl = document.getElementById('message');
  const puzzleNoEl = document.getElementById('puzzleNo');

  const notesBtn = document.getElementById('notesBtn');
  const eraseBtn = document.getElementById('eraseBtn');
  const hintBtn = document.getElementById('hintBtn');
  const newBtn = document.getElementById('newBtn');
  const solveBtn = document.getElementById('solveBtn');
  const bookmarks = document.querySelectorAll('.bookmark');

  /* ============ Build static UI pieces ============ */

  function buildGridDom() {
    gridEl.innerHTML = '';
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.row = r;
        cell.dataset.col = c;
        cell.setAttribute('role', 'gridcell');
        cell.addEventListener('click', () => selectCell(r, c));
        gridEl.appendChild(cell);
      }
    }
  }

  function buildNumpadDom() {
    numpadEl.innerHTML = '';
    for (let n = 1; n <= 9; n++) {
      const btn = document.createElement('button');
      btn.className = 'num-btn';
      btn.type = 'button';
      btn.textContent = n;
      btn.addEventListener('click', () => inputNumber(n));
      numpadEl.appendChild(btn);
    }
  }

  buildGridDom();
  buildNumpadDom();

  /* ============ Game flow ============ */

  function startNewGame(level) {
    state.level = level;
    const cfg = DIFFICULTY[level];
    setMessage('Setting the type… generating a fresh puzzle.');

    // defer so the message paints before the (synchronous) generation work
    setTimeout(() => {
      const { puzzle, solution } = generatePuzzle(cfg.clues);
      state.puzzle = puzzle;
      state.solution = solution;
      state.given = puzzle.map((row) => row.map((v) => v !== 0));
      state.board = puzzle.map((row) => row.slice());
      state.notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
      state.selected = null;
      state.mistakes = 0;
      state.maxMistakes = 3;
      state.hintsLeft = cfg.hints;
      state.timerSeconds = 0;
      state.solved = false;
      state.gameOver = false;
      state.puzzleNumber = Math.floor(Math.random() * 900) + 100;

      stopTimer();
      startTimer();
      gridEl.classList.remove('locked-out');
      numpadEl.classList.remove('locked-out');
      renderAll();
      setMessage('');
      puzzleNoEl.textContent = String(state.puzzleNumber).padStart(3, '0');
    }, 10);
  }

  function selectCell(r, c) {
    if (state.solved || state.gameOver) return;
    state.selected = [r, c];
    renderSelection();
  }

  function inputNumber(num) {
    if (state.solved || state.gameOver || !state.selected) return;
    const [r, c] = state.selected;
    if (state.given[r][c]) return;

    if (state.notesMode) {
      const set = state.notes[r][c];
      if (set.has(num)) set.delete(num);
      else set.add(num);
      state.board[r][c] = 0;
      renderCell(r, c);
      return;
    }

    state.board[r][c] = num;
    state.notes[r][c].clear();

    const correct = state.solution[r][c] === num;
    if (!correct) {
      state.mistakes++;
      mistakesEl.textContent = `${state.mistakes} / ${state.maxMistakes}`;
    }

    renderAll();
    checkWinOrLoss();
  }

  function eraseCell() {
    if (state.solved || state.gameOver || !state.selected) return;
    const [r, c] = state.selected;
    if (state.given[r][c]) return;
    state.board[r][c] = 0;
    state.notes[r][c].clear();
    renderAll();
  }

  function giveHint() {
    if (state.solved || state.gameOver || state.hintsLeft <= 0) return;

    let target = state.selected;
    if (!target || state.given[target[0]][target[1]] || state.board[target[0]][target[1]] === state.solution[target[0]][target[1]]) {
      // pick a random empty/incorrect cell
      const candidates = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (!state.given[r][c] && state.board[r][c] !== state.solution[r][c]) {
            candidates.push([r, c]);
          }
        }
      }
      if (candidates.length === 0) return;
      target = candidates[Math.floor(Math.random() * candidates.length)];
    }

    const [r, c] = target;
    state.board[r][c] = state.solution[r][c];
    state.notes[r][c].clear();
    state.hintsLeft--;
    state.selected = [r, c];
    hintsLeftEl.textContent = state.hintsLeft;

    renderAll();
    const cellEl = cellAt(r, c);
    cellEl.classList.add('hint-filled');
    checkWinOrLoss();
  }

  function solveForMe() {
    if (state.solved) return;
    // Reveal the solution even after a game over, so a lost round isn't a dead end.
    state.gameOver = false;
    gridEl.classList.remove('locked-out');
    numpadEl.classList.remove('locked-out');

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!state.given[r][c]) {
          state.board[r][c] = state.solution[r][c];
        }
      }
    }
    state.solved = true;
    stopTimer();
    renderAll();
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (!state.given[r][c]) cellAt(r, c).classList.add('solver-filled');
      }
    }
    showStamp('solver');
    setMessage('Solved for you — the ink\u2019s already dry. Start a new puzzle when you\u2019re ready.');
  }

  function triggerGameOver() {
    state.gameOver = true;
    stopTimer();
    gridEl.classList.add('locked-out');
    numpadEl.classList.add('locked-out');
    showStamp('gameover');
    setMessage(`Three mistakes — that\u2019s the round. Start a new puzzle, or reveal the solution.`);
  }

  function checkWinOrLoss() {
    if (state.mistakes >= state.maxMistakes) {
      triggerGameOver();
      return;
    }
    const complete = state.board.every((row, r) => row.every((v, c) => v === state.solution[r][c]));
    if (complete) {
      state.solved = true;
      stopTimer();
      showStamp('win');
      setMessage(`Solved in ${formatTime(state.timerSeconds)} with ${state.mistakes} mistake${state.mistakes === 1 ? '' : 's'}. Well played.`);
    }
  }

  function showStamp(kind) {
    // kind: 'win' | 'solver' | 'gameover'
    stampEl.textContent = kind === 'gameover' ? 'Game Over' : 'Solved';
    stampEl.classList.remove('stamp-solver', 'stamp-gameover');
    if (kind === 'solver') stampEl.classList.add('stamp-solver');
    if (kind === 'gameover') stampEl.classList.add('stamp-gameover');
    stampEl.classList.add('show');
  }

  function hideStamp() {
    stampEl.classList.remove('show', 'stamp-solver', 'stamp-gameover');
  }

  /* ============ Timer ============ */

  function startTimer() {
    state.timerHandle = setInterval(() => {
      state.timerSeconds++;
      timerEl.textContent = formatTime(state.timerSeconds);
    }, 1000);
  }

  function stopTimer() {
    if (state.timerHandle) clearInterval(state.timerHandle);
    state.timerHandle = null;
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const s = (totalSeconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  /* ============ Rendering ============ */

  function cellAt(r, c) {
    return gridEl.children[r * 9 + c];
  }

  function renderCell(r, c) {
    const el = cellAt(r, c);
    const value = state.board[r][c];
    el.classList.remove('given', 'error', 'hint-filled', 'solver-filled');
    el.innerHTML = '';

    if (value !== 0) {
      el.textContent = value;
      if (state.given[r][c]) {
        el.classList.add('given');
      } else if (state.solution[r][c] !== value) {
        el.classList.add('error');
      }
    } else {
      const notes = state.notes[r][c];
      if (notes.size > 0) {
        const notesGrid = document.createElement('div');
        notesGrid.className = 'notes-grid';
        for (let n = 1; n <= 9; n++) {
          const span = document.createElement('span');
          span.textContent = notes.has(n) ? n : '';
          notesGrid.appendChild(span);
        }
        el.appendChild(notesGrid);
      }
    }
  }

  function renderBoard() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        renderCell(r, c);
      }
    }
  }

  function renderSelection() {
    const cells = gridEl.children;
    for (let i = 0; i < cells.length; i++) {
      cells[i].classList.remove('selected', 'peer', 'same-value');
    }
    if (!state.selected) return;
    const [sr, sc] = state.selected;
    const selectedValue = state.board[sr][sc];

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const sameRow = r === sr;
        const sameCol = c === sc;
        const sameBox = Math.floor(r / 3) === Math.floor(sr / 3) && Math.floor(c / 3) === Math.floor(sc / 3);
        if (sameRow || sameCol || sameBox) cellAt(r, c).classList.add('peer');
        if (selectedValue !== 0 && state.board[r][c] === selectedValue) {
          cellAt(r, c).classList.add('same-value');
        }
      }
    }
    cellAt(sr, sc).classList.add('selected');
  }

  function renderNumpad() {
    const counts = Array(10).fill(0);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        const v = state.board[r][c];
        if (v !== 0 && state.solution[r][c] === v) counts[v]++;
      }
    }
    const buttons = numpadEl.children;
    for (let n = 1; n <= 9; n++) {
      buttons[n - 1].classList.toggle('exhausted', counts[n] >= 9);
    }
  }

  function renderAll() {
    renderBoard();
    renderSelection();
    renderNumpad();
    timerEl.textContent = formatTime(state.timerSeconds);
    mistakesEl.textContent = `${state.mistakes} / ${state.maxMistakes}`;
    hintsLeftEl.textContent = state.hintsLeft;
    levelLabelEl.textContent = DIFFICULTY[state.level].label;
    hideStamp();
  }

  function setMessage(text) {
    messageEl.textContent = text;
  }

  /* ============ Events ============ */

  bookmarks.forEach((btn) => {
    btn.addEventListener('click', () => {
      bookmarks.forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
      startNewGame(btn.dataset.level);
    });
  });

  notesBtn.addEventListener('click', () => {
    state.notesMode = !state.notesMode;
    notesBtn.setAttribute('aria-pressed', String(state.notesMode));
  });

  eraseBtn.addEventListener('click', eraseCell);
  hintBtn.addEventListener('click', giveHint);
  newBtn.addEventListener('click', () => startNewGame(state.level));
  solveBtn.addEventListener('click', solveForMe);

  document.addEventListener('keydown', (e) => {
    if (!state.selected) return;
    const [r, c] = state.selected;

    if (e.key >= '1' && e.key <= '9') {
      inputNumber(Number(e.key));
    } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
      eraseCell();
    } else if (e.key === 'ArrowUp') {
      selectCell(Math.max(0, r - 1), c);
    } else if (e.key === 'ArrowDown') {
      selectCell(Math.min(8, r + 1), c);
    } else if (e.key === 'ArrowLeft') {
      selectCell(r, Math.max(0, c - 1));
    } else if (e.key === 'ArrowRight') {
      selectCell(r, Math.min(8, c + 1));
    } else {
      return;
    }
    e.preventDefault();
  });

  /* ============ Init ============ */

  bookmarks[0].setAttribute('aria-selected', 'true');
  startNewGame('easy');
})();
