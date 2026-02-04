const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const imagesPath = path.join(__dirname, '..', 'public', 'images');


function getRandomListFromImages() {
  const files = fs.readdirSync(imagesPath)
    .filter(f => f.endsWith('.png'))
    .map(f => f.replace('.png', '').toLowerCase());

  return files.sort(() => 0.5 - Math.random()).slice(0, 25);
}

const rooms = {};

const pokemons = [
  "pikachu","charizard","bulbasaur","squirtle","jigglypuff",
  "meowth","psyduck","snorlax","gengar","eevee",
  "dragonite","mewtwo","pidgeot","alakazam","machamp",
  "gyarados","lapras","ditto","vaporeon","arcanine",
  "scyther","charmeleon","arbok","rattata","zubat"
];

function startRound(roomId) {
  const room = rooms[roomId];
  if (!room || room.players.length < 2) return;

  const [p1, p2] = room.players;

  // 👉 Elegir lista según modo
  if (room.mode === 'random') {
    room.currentList = getRandomListFromImages();
  } else {
    room.currentList = pokemons;
  }

  function getRandomFromList() {
    const list = room.currentList;
    return list[Math.floor(Math.random() * list.length)];
  }

  room.secret[p1] = getRandomFromList();
  room.secret[p2] = getRandomFromList();
  room.turn = p1;

  io.to(p1).emit('new-round', {
    yourPokemon: room.secret[p1],
    yourTurn: true,
    score: room.score,
    pokemons: room.currentList
  });

  io.to(p2).emit('new-round', {
    yourPokemon: room.secret[p2],
    yourTurn: false,
    score: room.score,
    pokemons: room.currentList
  });
}

io.on('connection', (socket) => {

  socket.on('join-room', (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = {
        players: [],
        secret: {},
        turn: null,
        score: { p1: 0, p2: 0 },
        mode: 'classic',
        currentList: pokemons
      };
    }

    const room = rooms[roomId];

    // limpiar sockets muertos
    room.players = room.players.filter(id => io.sockets.sockets.get(id));

    if (room.players.length < 2) {
      room.players.push(socket.id);
    }

    io.to(socket.id).emit('show-lobby', {
      ready: room.players.length === 2
    });

    if (room.players.length === 2) {
      io.to(roomId).emit('players-ready');
    }
  });

  socket.on('select-game', ({ roomId, game, mode }) => {
    const room = rooms[roomId];
    if (!room || room.players.length < 2) return;

    room.mode = mode || 'classic';

    if (game === 'whoiswho') {
      io.to(roomId).emit('start-whoiswho');
      startRound(roomId);
    }
  });

  socket.on('guess', ({ roomId, pokemon }) => {
    const room = rooms[roomId];
    if (!room) return;

    const [p1, p2] = room.players;
    const opponentId = socket.id === p1 ? p2 : p1;
    const opponentSecret = room.secret[opponentId];

    if (pokemon === opponentSecret) {

      if (socket.id === p1) room.score.p1 += 1;
      else room.score.p2 += 1;

      io.to(roomId).emit('game-over', {
        winner: socket.id,
        score: room.score
      });

    } else {
      room.turn = opponentId;
      io.to(room.turn).emit('turn-update', true);
      io.to(socket.id).emit('turn-update', false);
    }
  });

  socket.on('rematch', (roomId) => {
    startRound(roomId);
  });

  socket.on('disconnect', () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];
      room.players = room.players.filter(id => id !== socket.id);

      io.to(roomId).emit('show-lobby', {
        ready: room.players.length === 2
      });
    }
  });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor iniciado en: http://localhost:${PORT}`);
});
