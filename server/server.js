const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {};

const pokemons = [
  "pikachu","charizard","bulbasaur","squirtle","jigglypuff",
  "meowth","psyduck","snorlax","gengar","eevee",
  "dragonite","mewtwo","pidgeot","alakazam","machamp",
  "gyarados","lapras","ditto","vaporeon","arcanine"
];

function getRandomPokemon() {
  return pokemons[Math.floor(Math.random() * pokemons.length)];
}

function startRound(roomId) {
  const room = rooms[roomId];
  const [p1, p2] = room.players;

  room.secret[p1] = getRandomPokemon();
  room.secret[p2] = getRandomPokemon();
  room.turn = p1;

  io.to(p1).emit('new-round', {
    yourPokemon: room.secret[p1],
    yourTurn: true,
    score: room.score
  });

  io.to(p2).emit('new-round', {
    yourPokemon: room.secret[p2],
    yourTurn: false,
    score: room.score
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
        score: {}
      };
    }

    const room = rooms[roomId];

    if (room.players.length < 2) {
      room.players.push(socket.id);
      room.score[socket.id] = 0;
    }

    if (room.players.length === 2) {
      startRound(roomId);
    }
  });

  socket.on('guess', ({ roomId, pokemon }) => {
    const room = rooms[roomId];
    const opponentId = room.players.find(id => id !== socket.id);
    const opponentSecret = room.secret[opponentId];

    if (pokemon === opponentSecret) {
      room.score[socket.id] += 1;

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

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Servidor iniciado'));

