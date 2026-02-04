const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

let myTurn = false;
let pokemons = []; // 🔥 ahora vienen del server
const buttons = {};

socket.emit('join-room', roomId);

/* ================= LOBBY ================= */

function setLobbyButtons(enabled) {
  document.getElementById('whoClassicBtn').disabled = !enabled;
  document.getElementById('whoRandomBtn').disabled = !enabled;
  document.getElementById('towerBtn').disabled = !enabled;
}
function showLobby(ready) {
  document.getElementById('lobbyScreen').classList.remove('hidden');
  document.getElementById('whoiswhoScreen').classList.add('hidden');

  document.getElementById('status').innerText =
    ready ? "¡Jugador conectado! Elegí un juego" : "Esperando jugador...";

  setLobbyButtons(ready);
}

function enableLobby() {
  document.getElementById('status').innerText =
    "¡Jugador conectado! Elegí un juego";

  setLobbyButtons(true);
}

function showWhoIsWho() {
  document.getElementById('lobbyScreen').classList.add('hidden');
  document.getElementById('whoiswhoScreen').classList.remove('hidden');
}

function selectGame(game, mode) {
  socket.emit('select-game', { roomId, game, mode });
}

/* ================= TABLERO DINÁMICO ================= */

const board = document.getElementById('board');

function renderBoard() {
  board.innerHTML = '';
  Object.keys(buttons).forEach(k => delete buttons[k]);

  pokemons.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'poke-card';

    const img = document.createElement('img');
    img.src = `images/${p}.png`;

    const name = document.createElement('p');
    name.className = 'poke-name';
    name.innerText = p;

    btn.appendChild(img);
    btn.appendChild(name);

    btn.onclick = () => btn.classList.toggle('eliminated');

    board.appendChild(btn);
    buttons[p] = btn;
  });
}

function clearBoard() {
  Object.values(buttons).forEach(b => b.classList.remove('eliminated'));
  document.getElementById('guessInput').value = "";
}

/* ================= UI ================= */

function updateTurnText() {
  document.getElementById('turn').innerText =
    myTurn ? "TU TURNO" : "Turno del rival";
}

function updateScore(score) {
  document.getElementById('scoreboard').innerText =
    `Jugador 1: ${score.p1} | Jugador 2: ${score.p2}`;
}

function showPopup(message) {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popup-text');
  popupText.innerText = message;
  popup.classList.add('show');
  document.getElementById('rematchBtn').style.display = "block";
}

/* ================= SOCKET EVENTS ================= */

socket.on('show-lobby', ({ ready }) => {
  showLobby(ready);
});

socket.on('players-ready', () => {
  enableLobby();
});

socket.on('start-whoiswho', () => {
  showWhoIsWho();
});

socket.on('new-round', ({ yourPokemon, yourTurn, score, pokemons: list }) => {
  pokemons = list;          // 🔥 vienen del server
  renderBoard();            // 🔥 se arma el tablero acá
  clearBoard();

  document.getElementById('popup').classList.remove('show');
  document.getElementById('rematchBtn').style.display = "none";
  document.getElementById('secret').src = `images/${yourPokemon}.png`;

  myTurn = yourTurn;
  updateTurnText();
  updateScore(score);
});

socket.on('turn-update', (turn) => {
  myTurn = turn;
  updateTurnText();
});

socket.on('game-over', ({ winner, score }) => {
  updateScore(score);
  if (winner === socket.id) {
    showPopup("¡Ganaste!");
  } else {
    showPopup("Perdiste");
  }
});

/* ================= ACCIONES ================= */

function guess() {
  if (!myTurn) return;
  const pokemon = document.getElementById('guessInput').value.toLowerCase();
  if (buttons[pokemon]) buttons[pokemon].classList.add('eliminated');
  socket.emit('guess', { roomId, pokemon });
}

function rematch() {
  document.getElementById('popup').classList.remove('show');
  socket.emit('rematch', roomId);
}
