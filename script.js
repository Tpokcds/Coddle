// Black Ops 6 — Weapons/modes Wordle-like (variable-length)
// Allowed characters: letters, digits, hyphen '-', space ' '
// Guesses must be one of the items in WORDS (the provided list)

const WORDS = [
  "kompact-92","lc-10","pp919","kilo-141","jackal-pdw","grevokka","ames-85",
  "ak74","stimshot","molotov","semtex","blackopps","crimson","nuketown",
  "dreadnaught","kar98","score streaks","domination","kill confirmed"
].map(s => s.toLowerCase());

// Game constants
const MAX_TRIES = 6;

let secret = "";
let secretLen = 0;
let rowIndex = 0;
let colIndex = 0;
let board = []; // rows x variable cols
let gameOver = false;

const grid = document.getElementById("grid");
const keyboard = document.getElementById("keyboard");
const message = document.getElementById("message");
const newGameBtn = document.getElementById("newGame");
const revealBtn = document.getElementById("reveal");
const lengthInfo = document.getElementById("lengthInfo");
const triesInfo = document.getElementById("triesInfo");

// Characters allowed
const ALLOWED_REGEX = /^[a-z0-9\- ]$/i;

// Choose a new secret at random
function pickSecret() {
  secret = WORDS[Math.floor(Math.random() * WORDS.length)];
  secretLen = secret.length;
}

// Initialize board and UI
function newGame() {
  pickSecret();
  rowIndex = 0;
  colIndex = 0;
  gameOver = false;
  board = Array.from({ length: MAX_TRIES }, () => Array.from({ length: secretLen }, () => ""));
  message.textContent = "";
  lengthInfo.textContent = `Length: ${secretLen} characters`;
  triesInfo.textContent = `Tries: ${MAX_TRIES}`;
  renderGrid();
  renderKeyboard();
}

// Render dynamic grid for current secret length
function renderGrid() {
  grid.innerHTML = "";
  for (let r = 0; r < MAX_TRIES; r++) {
    const row = document.createElement("div");
    row.className = "row";
    for (let c = 0; c < secretLen; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.dataset.r = r;
      tile.dataset.c = c;
      tile.textContent = board[r][c] ? board[r][c].toUpperCase() : "";
      row.appendChild(tile);
    }
    grid.appendChild(row);
  }
}

// Build keyboard (letters, numbers, hyphen, space, Enter, Back)
function renderKeyboard() {
  keyboard.innerHTML = "";

  const row1 = "qwertyuiop";
  const row2 = "asdfghjkl";
  const row3 = "zxcvbnm";
  const nums  = "1234567890";

  // numbers row
  const nrow = document.createElement("div"); nrow.className = "keyboard-row";
  for (const d of nums) nrow.appendChild(makeKey(d));
  keyboard.appendChild(nrow);

  const r1 = document.createElement("div"); r1.className = "keyboard-row";
  for (const ch of row1) r1.appendChild(makeKey(ch));
  keyboard.appendChild(r1);

  const r2 = document.createElement("div"); r2.className = "keyboard-row";
  for (const ch of row2) r2.appendChild(makeKey(ch));
  keyboard.appendChild(r2);

  const r3 = document.createElement("div"); r3.className = "keyboard-row";
  r3.appendChild(makeKey("Enter","wide"));
  for (const ch of row3) r3.appendChild(makeKey(ch));
  r3.appendChild(makeKey("-", "wide"));
  r3.appendChild(makeKey("Space","wide"));
  r3.appendChild(makeKey("Back","wide"));
  keyboard.appendChild(r3);
}

function makeKey(label, extra='') {
  const k = document.createElement("div");
  k.className = "key " + extra;
  k.textContent = label;
  k.dataset.key = label;
  k.addEventListener("click", () => handleKey(label));
  return k;
}

// Handle on-screen keyboard clicks and physical keys
function handleKey(label) {
  if (gameOver) return;
  if (label === "Enter") return onEnter();
  if (label === "Back") return onBack();
  if (label === "Space") return onChar(" ");
  // single-character keys (letters, digits, hyphen)
  if (label.length === 1) return onChar(label);
}

// Add character to current tile
function onChar(ch) {
  if (colIndex >= secretLen) return;
  if (!ALLOWED_REGEX.test(ch)) return;
  board[rowIndex][colIndex] = ch.toLowerCase();
  colIndex++;
  updateTiles();
}

// Backspace
function onBack() {
  if (colIndex <= 0) return;
  colIndex--;
  board[rowIndex][colIndex] = "";
  updateTiles();
}

// Submit guess
function onEnter() {
  if (colIndex !== secretLen) {
    showMessage("Not enough characters");
    return;
  }
  const guess = board[rowIndex].join("").toLowerCase();
  if (!isValidWord(guess)) {
    showMessage("Not in allowed list");
    return;
  }
  const evaluation = evaluateGuess(secret, guess); // array of 'correct'|'present'|'absent'
  flipRow(rowIndex, evaluation);
  updateKeyStates(guess, evaluation);

  if (evaluation.every(s => s === 'correct')) {
    gameOver = true;
    showMessage("Correct — you win! 🎉");
    return;
  }

  rowIndex++;
  colIndex = 0;
  if (rowIndex >= MAX_TRIES) {
    gameOver = true;
    showMessage(`Out of tries — answer was: ${secret.toUpperCase()}`);
  }
}

// Validate guess against list (must match exactly one of the provided items)
function isValidWord(w) {
  return WORDS.includes(w.toLowerCase());
}

function showMessage(txt, ms=3000){
  message.textContent = txt;
  if (ms>0){
    clearTimeout(message._t);
    message._t = setTimeout(()=> {
      if(!gameOver) message.textContent = '';
    }, ms);
  }
}

// Evaluate guess with correct duplicate handling
function evaluateGuess(secretWord, guessWord) {
  const L = secretWord.length;
  const res = Array(L).fill('absent');
  const secretArr = secretWord.split('');
  const guessArr = guessWord.split('');

  // First mark exact matches
  const secretCounts = {};
  for (let i = 0; i < L; i++) {
    if (guessArr[i] === secretArr[i]) {
      res[i] = 'correct';
    } else {
      secretCounts[secretArr[i]] = (secretCounts[secretArr[i]] || 0) + 1;
    }
  }
  // Then mark present up to remaining counts
  for (let i = 0; i < L; i++) {
    if (res[i] === 'correct') continue;
    const g = guessArr[i];
    if (secretCounts[g]) {
      res[i] = 'present';
      secretCounts[g]--;
    }
  }
  return res;
}

// Flip animation + set tile classes
function flipRow(r, evaluation) {
  const tiles = Array.from(document.querySelectorAll(`.tile`)).filter(t => Number(t.dataset.r) === r).sort((a,b)=>a.dataset.c - b.dataset.c);
  tiles.forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add('flip');
      setTimeout(() => {
        tile.classList.remove('flip');
        tile.classList.add(evaluation[i]);
      }, 220);
    }, i * 180);
  });
}

// Update visible letters in grid
function updateTiles(){
  const tiles = Array.from(document.querySelectorAll('.tile'));
  tiles.forEach(t => {
    const r = Number(t.dataset.r), c = Number(t.dataset.c);
    t.textContent = board[r][c] ? board[r][c].toUpperCase() : '';
  });
}

// Update keyboard coloring (prefer stronger state)
function updateKeyStates(guess, evaluation){
  for (let i = 0; i < guess.length; i++){
    const ch = guess[i];
    const state = evaluation[i]; // 'correct'|'present'|'absent'
    // find key element whose dataset.key matches this char (case-insensitive)
    const keys = Array.from(document.querySelectorAll('.key')).filter(k => k.dataset.key && k.dataset.key.toLowerCase() === ch.toLowerCase());
    keys.forEach(k => {
      const current = k.classList.contains('correct') ? 'correct' : k.classList.contains('present') ? 'present' : k.classList.contains('absent') ? 'absent' : null;
      const priority = { 'correct':3, 'present':2, 'absent':1, null:0 };
      if (priority[state] > priority[current]) {
        k.classList.remove('correct','present','absent');
        k.classList.add(state);
      }
    });
  }
}

// Physical keyboard handling
window.addEventListener('keydown', (e) => {
  if (gameOver) return;
  if (e.key === 'Enter') { handleKey('Enter'); e.preventDefault(); }
  else if (e.key === 'Backspace') { handleKey('Back'); e.preventDefault(); }
  else if (e.key === ' ') { handleKey('Space'); e.preventDefault(); }
  else if (/^[a-z0-9\-]$/i.test(e.key)) { handleKey(e.key); }
});

// Buttons
newGameBtn.addEventListener('click', newGame);
revealBtn.addEventListener('click', () => showMessage(`Answer: ${secret.toUpperCase()}`, 8000));

// Initialize
(function init(){
  newGame();
})();
