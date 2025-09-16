// Mini Wordle logic
// - 5-letter words, 6 rows
// - duplicate-letter handling done by counting occurrences

const WORDS = [
  // short demo list: replace or extend with a larger valid word list
  "apple","spare","crane","brink","gloss","plane","apple","charm","flute","grace",
  "trace","stone","quilt","swing","light","claim","blaze","shore","proud","align"
].map(w => w.toLowerCase());

const MAX_ROWS = 6;
const WORD_LEN = 5;

let secret = '';
let rowIndex = 0;
let colIndex = 0;
let board = []; // rows x cols char or ''
let isOver = false;
const dailyToggle = document.getElementById('dailyToggle');

const grid = document.getElementById('grid');
const keyboard = document.getElementById('keyboard');
const message = document.getElementById('message');
const newGameBtn = document.getElementById('newGame');

function chooseSecret(daily=false){
  if(daily){
    const today = new Date().toISOString().slice(0,10); // YYYY-MM-DD
    // simple deterministic pick: hash date
    let seed = 0;
    for(let i=0;i<today.length;i++) seed = (seed*31 + today.charCodeAt(i))|0;
    return WORDS[Math.abs(seed) % WORDS.length];
  }
  return WORDS[Math.floor(Math.random()*WORDS.length)];
}

function initBoard(){
  board = Array.from({length:MAX_ROWS}, () => Array.from({length:WORD_LEN}, ()=>''));
  rowIndex = 0;
  colIndex = 0;
  isOver = false;
  message.textContent = '';
  renderGrid();
  renderKeyboard();
}

function renderGrid(){
  grid.innerHTML='';
  for(let r=0;r<MAX_ROWS;r++){
    const row = document.createElement('div');
    row.className = 'row';
    for(let c=0;c<WORD_LEN;c++){
      const t = document.createElement('div');
      t.className = 'tile';
      t.dataset.r = r; t.dataset.c = c;
      t.textContent = board[r][c] ? board[r][c].toUpperCase() : '';
      row.appendChild(t);
    }
    grid.appendChild(row);
  }
}

function renderKeyboard(){
  keyboard.innerHTML='';
  const rows = ["qwertyuiop","asdfghjkl","zxcvbnm"];
  rows.forEach((rstr, idx) => {
    const row = document.createElement('div');
    row.className = 'keyboard-row';
    if(idx===2){
      const enter = keyEl('Enter','wide'); row.appendChild(enter);
    }
    for(const ch of rstr){
      row.appendChild(keyEl(ch));
    }
    if(idx===2){
      const del = keyEl('Back','wide'); row.appendChild(del);
    }
    keyboard.appendChild(row);
  });
}

function keyEl(label, extra=''){
  const k = document.createElement('div');
  k.className = 'key ' + extra;
  k.textContent = label;
  k.dataset.key = label;
  k.addEventListener('click', () => handleKey(label));
  return k;
}

function setKeyState(letter, state){
  // state: 'absent' | 'present' | 'correct'
  const keys = Array.from(document.querySelectorAll('.key')).filter(el => el.dataset.key && el.dataset.key.toLowerCase()===letter.toLowerCase());
  keys.forEach(k => {
    k.classList.remove('absent','present','correct');
    k.classList.add(state);
  });
}

function handleKey(label){
  if(isOver) return;
  if(label === 'Enter') return onEnter();
  if(label === 'Back') return onBackspace();
  const ch = label.toLowerCase();
  if(/^[a-z]$/.test(ch)) onLetter(ch);
}

function onLetter(ch){
  if(colIndex >= WORD_LEN) return;
  board[rowIndex][colIndex] = ch;
  colIndex++;
  updateTiles();
}

function onBackspace(){
  if(colIndex <= 0) return;
  colIndex--;
  board[rowIndex][colIndex] = '';
  updateTiles();
}

function onEnter(){
  if(colIndex !== WORD_LEN) {
    flashMessage('Not enough letters');
    return;
  }
  const guess = board[rowIndex].join('');
  if(!isValidWord(guess)){
    flashMessage('Not in word list');
    return;
  }
  const evaluation = evaluateGuess(secret, guess); // array of 'correct'|'present'|'absent'
  flipRow(rowIndex, evaluation);
  updateKeyStates(guess, evaluation);

  if(evaluation.every(s => s === 'correct')){
    isOver = true;
    flashMessage('Correct — you win! 🎉');
    return;
  }

  rowIndex++;
  colIndex = 0;
  if(rowIndex >= MAX_ROWS){
    isOver = true;
    flashMessage(`Out of guesses — word was ${secret.toUpperCase()}`);
  }
}

function isValidWord(w){
  return WORDS.includes(w);
}

function flashMessage(txt, ms=2200){
  message.textContent = txt;
  if(ms>0){
    clearTimeout(message._t);
    message._t = setTimeout(()=> {
      if(!isOver) message.textContent = '';
    }, ms);
  }
}

// correctly mark duplicates: first mark correct positions, then mark present up to remaining counts
function evaluateGuess(secretWord, guessWord){
  const res = Array(WORD_LEN).fill('absent');
  const secretArr = secretWord.split('');
  const guessArr = guessWord.split('');
  const secretCounts = {};
  // count letters in secret except those already matched as correct
  for(let i=0;i<WORD_LEN;i++){
    if(secretArr[i] === guessArr[i]){
      res[i] = 'correct';
    } else {
      secretCounts[secretArr[i]] = (secretCounts[secretArr[i]]||0) + 1;
    }
  }
  for(let i=0;i<WORD_LEN;i++){
    if(res[i] === 'correct') continue;
    const g = guessArr[i];
    if(secretCounts[g]){
      res[i] = 'present';
      secretCounts[g]--;
    } else {
      res[i] = 'absent';
    }
  }
  return res;
}

function flipRow(r, evaluation){
  const tiles = Array.from(document.querySelectorAll(`.tile`)).filter(t => Number(t.dataset.r) === r).sort((a,b) => a.dataset.c - b.dataset.c);
  // animate flip sequentially
  tiles.forEach((tile, i) => {
    setTimeout(() => {
      tile.classList.add('flip');
      // after small delay, set color
      setTimeout(() => {
        tile.classList.remove('flip');
        tile.classList.add(evaluation[i]);
        // set content already set
      }, 250);
    }, i * 220);
  });
}

function updateTiles(){
  const tiles = Array.from(document.querySelectorAll('.tile'));
  tiles.forEach(t => {
    const r = Number(t.dataset.r), c = Number(t.dataset.c);
    t.textContent = board[r][c] ? board[r][c].toUpperCase() : '';
  });
}

function updateKeyStates(guess, evaluation){
  // apply states but prefer stronger (correct > present > absent)
  for(let i=0;i<guess.length;i++){
    const letter = guess[i];
    const state = evaluation[i];
    const existing = Array.from(document.querySelectorAll('.key')).find(k => k.dataset.key && k.dataset.key.toLowerCase() === letter);
    // determine best state to set
    const current = existing && (existing.classList.contains('correct') ? 'correct' : existing.classList.contains('present') ? 'present' : existing.classList.contains('absent') ? 'absent' : null);
    const priority = { 'correct':3, 'present':2, 'absent':1, null:0 };
    if(priority[state] > priority[current]) setKeyState(letter, state);
  }
}

// keyboard events
window.addEventListener('keydown', (e) => {
  if(e.key === 'Enter') handleKey('Enter');
  else if(e.key === 'Backspace') handleKey('Back');
  else if(/^[a-zA-Z]$/.test(e.key)) handleKey(e.key);
});

newGameBtn.addEventListener('click', () => {
  secret = chooseSecret(dailyToggle.checked);
  initBoard();
});

// toggle daily immediately starts a new game
dailyToggle.addEventListener('change', () => {
  secret = chooseSecret(dailyToggle.checked);
  initBoard();
});

// initial setup
(function(){
  secret = chooseSecret(false);
  initBoard();
})();
