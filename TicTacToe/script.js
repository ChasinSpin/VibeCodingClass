const cells = [...document.querySelectorAll('.cell')];
const modeButtons = [...document.querySelectorAll('.mode')];
const statusText = document.querySelector('#status');
const playerX = document.querySelector('#playerX');
const playerO = document.querySelector('#playerO');
const scoreX = document.querySelector('#scoreX');
const scoreO = document.querySelector('#scoreO');
const opponentLabel = document.querySelector('#opponentLabel');
const opponentName = document.querySelector('#opponentName');
const positions = ['Top left', 'Top middle', 'Top right', 'Middle left', 'Center', 'Middle right', 'Bottom left', 'Bottom middle', 'Bottom right'];
const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];

let board = Array(9).fill('');
let turn = 'X';
let mode = 'computer';
let scores = { X: 0, O: 0 };
let finished = false;
let thinking = false;
let computerTimer;

function result(state) {
  for (const line of lines) {
    const [a,b,c] = line;
    if (state[a] && state[a] === state[b] && state[a] === state[c]) return { winner: state[a], line };
  }
  return state.every(Boolean) ? { winner: 'draw', line: [] } : null;
}

function render() {
  cells.forEach((cell, index) => {
    cell.textContent = board[index] === 'X' ? '✕' : board[index] === 'O' ? '◯' : '';
    cell.className = 'cell';
    if (board[index]) cell.classList.add(board[index].toLowerCase());
    cell.disabled = Boolean(board[index]) || finished || thinking;
    cell.setAttribute('aria-label', `${positions[index]}, ${board[index] || 'empty'}`);
  });
  const outcome = result(board);
  if (outcome?.winner !== 'draw') outcome?.line.forEach(index => cells[index].classList.add('win'));
  playerX.classList.toggle('current', !finished && turn === 'X');
  playerO.classList.toggle('current', !finished && turn === 'O');
  scoreX.textContent = scores.X;
  scoreO.textContent = scores.O;
}

function announce() {
  const outcome = result(board);
  if (outcome?.winner === 'draw') statusText.textContent = 'A cosmic tie! Try another round.';
  else if (outcome?.winner === 'X') statusText.textContent = 'Commander X wins the galaxy!';
  else if (outcome?.winner === 'O') statusText.textContent = mode === 'computer' ? 'Nova Bot wins this round!' : 'Commander O wins the galaxy!';
  else if (turn === 'X') statusText.textContent = 'Your turn, Commander X';
  else statusText.textContent = mode === 'computer' ? 'Nova Bot is calculating...' : 'Your turn, Commander O';
}

function play(index) {
  if (finished || thinking || board[index]) return;
  board[index] = turn;
  const outcome = result(board);
  if (outcome) {
    finished = true;
    if (outcome.winner !== 'draw') scores[outcome.winner]++;
  } else {
    turn = turn === 'X' ? 'O' : 'X';
  }
  thinking = !finished && mode === 'computer' && turn === 'O';
  render();
  announce();
  if (thinking) computerTimer = setTimeout(computerMove, 480);
}

// Minimax makes Nova Bot a challenging opponent, while preferring center and corners on equal scores.
function minimax(state, player, depth) {
  const outcome = result(state);
  if (outcome) return outcome.winner === 'O' ? 10 - depth : outcome.winner === 'X' ? depth - 10 : 0;
  const values = [];
  for (const index of [4,0,2,6,8,1,3,5,7]) {
    if (state[index]) continue;
    state[index] = player;
    values.push(minimax(state, player === 'O' ? 'X' : 'O', depth + 1));
    state[index] = '';
  }
  return player === 'O' ? Math.max(...values) : Math.min(...values);
}

function computerMove() {
  thinking = false;
  if (finished || mode !== 'computer') return;
  let best = -Infinity;
  let chosen = -1;
  for (const index of [4,0,2,6,8,1,3,5,7]) {
    if (board[index]) continue;
    board[index] = 'O';
    const value = minimax(board, 'X', 1);
    board[index] = '';
    if (value > best) { best = value; chosen = index; }
  }
  if (chosen !== -1) play(chosen);
}

function newRound() {
  clearTimeout(computerTimer);
  board = Array(9).fill('');
  turn = 'X';
  finished = false;
  thinking = false;
  render();
  announce();
}

cells.forEach((cell, index) => cell.addEventListener('click', () => play(index)));
document.querySelector('#newRound').addEventListener('click', newRound);
document.querySelector('#resetScores').addEventListener('click', () => {
  scores = { X: 0, O: 0 };
  newRound();
});
modeButtons.forEach(button => button.addEventListener('click', () => {
  if (mode === button.dataset.mode) return;
  mode = button.dataset.mode;
  scores = { X: 0, O: 0 };
  modeButtons.forEach(item => {
    const active = item === button;
    item.classList.toggle('active', active);
    item.setAttribute('aria-pressed', String(active));
  });
  opponentLabel.textContent = mode === 'computer' ? 'AI OPPONENT' : 'PLAYER 2';
  opponentName.textContent = mode === 'computer' ? 'Nova Bot' : 'Commander O';
  newRound();
}));

render();
