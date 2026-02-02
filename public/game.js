const socket = io();
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('room');

let myTurn = false;

socket.emit('join-room', roomId);

const pokemons = [
  "pikachu","charizard","bulbasaur","squirtle","jigglypuff",
  "meowth","psyduck","snorlax","gengar","eevee",
  "dragonite","mewtwo","pidgeot","alakazam","machamp",
  "gyarados","lapras","ditto","vaporeon","arcanine"
];

const board = document.getElementById('board');
const buttons = {};

pokemons.forEach(p => {
  const btn = document.createElement('button');
  const img = document.createElement('img');
  img.src = `images/${p}.png`;
  btn.appendChild(img);
  btn.onclick = () => btn.classList.toggle('eliminated');
  board.appendChild(btn);
  buttons[p] = btn;
});

function clearBoard() {
  Object.values(buttons).forEach(b => b.classList.remove('eliminated'));
  document.getElementById('guessInput').value = "";
}

function updateTurnText() {
  document.getElementById('turn').innerText =
    myTurn ? "TU TURNO" : "Turno del rival";
}

function updateScore(score) {
  const [p1, p2] = Object.keys(score);
  document.getElementById('scoreboard').innerText =
    `Jugador 1: ${score[p1]} | Jugador 2: ${score[p2]}`;
}

socket.on('new-round', ({ yourPokemon, yourTurn, score }) => {
  // 🔥 limpiar TODO lo visual del round anterior
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

function guess() {
  if (!myTurn) return;
  const pokemon = document.getElementById('guessInput').value.toLowerCase();
  if (buttons[pokemon]) buttons[pokemon].classList.add('eliminated');
  socket.emit('guess', { roomId, pokemon });
}

function showPopup(message) {
  const popup = document.getElementById('popup');
  const popupText = document.getElementById('popup-text');
  popupText.innerText = message;
  popup.classList.add('show');
  document.getElementById('rematchBtn').style.display = "block";
}

socket.on('game-over', ({ winner, score }) => {
  updateScore(score);
  if (winner === socket.id) {
    showPopup("¡Ganaste!");
  } else {
    showPopup("Perdiste");
  }
});

function rematch() {
  document.getElementById('popup').classList.remove('show');
  socket.emit('rematch', roomId);
}
