const jwt = require('jsonwebtoken');
const {
  rooms,
  createRoom,
  joinRoom,
  getRoom,
  removeRoom,
  leaveRoom
} = require('./roomManager');
const { processSkillAction, clamp } = require('./skillProcessor');

const TICK_MS = 50;
const COUNTDOWN_MS = 3000;
const DOMINANCE_STEP = 3;
const ENERGY_DRAIN = 0.8;

function serializePlayer(player) {
  return {
    userId: player.userId,
    username: player.username,
    base: player.base,
    live: {
      energy: player.live.energy,
      combo: player.live.combo,
      reactionScore: player.live.reactionScore
    }
  };
}

function serializeRoom(room) {
  const p1 = room.players[0] || null;
  const p2 = room.players[1] || null;

  return {
    id: room.id,
    phase: room.phase,
    dominance: room.dominance,
    energy: room.energy,
    players: {
      p1: p1 ? serializePlayer(p1) : null,
      p2: p2 ? serializePlayer(p2) : null
    }
  };
}

function basePressure(player) {
  return (player.base.power * 0.6 + player.base.stability * 0.4) / 100;
}

function skillPressure(player) {
  return (player.live.combo * 20 + player.live.reactionScore * 0.3) / 100;
}

function applySkillDecay(player) {
  player.live.combo = clamp(player.live.combo - 0.01, 0.5, 3.0);
  player.live.reactionScore = clamp(player.live.reactionScore - 0.2, 0, 100);
}

function emitRoomUpdate(io, room) {
  io.to(room.id).emit('battleUpdate', serializeRoom(room));
}

function endBattle(io, room, result) {
  if (room.interval) {
    clearInterval(room.interval);
    room.interval = null;
  }

  if (room.countdownTimeout) {
    clearTimeout(room.countdownTimeout);
    room.countdownTimeout = null;
  }

  room.phase = 'finished';
  io.to(room.id).emit('battleEnd', result);
  emitRoomUpdate(io, room);
  io.in(room.id).socketsLeave(room.id);
  removeRoom(room.id);
}

function tickBattle(io, room) {
  if (!room || room.players.length < 2) {
    endBattle(io, room, { reason: 'player_left', winner: null });
    return;
  }

  const p1 = room.players[0];
  const p2 = room.players[1];

  applySkillDecay(p1);
  applySkillDecay(p2);

  const baseP1 = basePressure(p1);
  const baseP2 = basePressure(p2);
  const skillP1 = skillPressure(p1);
  const skillP2 = skillPressure(p2);

  const totalP1 = 0.5 * baseP1 + 0.5 * skillP1;
  const totalP2 = 0.5 * baseP2 + 0.5 * skillP2;

  room.dominance = clamp(room.dominance + (totalP1 - totalP2) * DOMINANCE_STEP, -100, 100);

  room.energy.p1 = clamp(room.energy.p1 - Math.max(0, totalP2) * ENERGY_DRAIN, 0, 100);
  room.energy.p2 = clamp(room.energy.p2 - Math.max(0, totalP1) * ENERGY_DRAIN, 0, 100);

  p1.live.energy = room.energy.p1;
  p2.live.energy = room.energy.p2;

  if (room.dominance >= 100) {
    endBattle(io, room, { reason: 'dominance', winner: p1.userId });
    return;
  }

  if (room.dominance <= -100) {
    endBattle(io, room, { reason: 'dominance', winner: p2.userId });
    return;
  }

  if (room.energy.p1 <= 0) {
    endBattle(io, room, { reason: 'energy', winner: p2.userId });
    return;
  }

  if (room.energy.p2 <= 0) {
    endBattle(io, room, { reason: 'energy', winner: p1.userId });
    return;
  }

  emitRoomUpdate(io, room);
}

function initBattleSockets(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token || !process.env.JWT_SECRET) {
      return next(new Error('Unauthorized'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;
      return next();
    } catch (err) {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('createRoom', (payload, callback) => {
      const room = createRoom(socket, socket.user);
      socket.data.roomId = room.id;
      socket.join(room.id);

      emitRoomUpdate(io, room);
      if (callback) {
        callback({ roomId: room.id });
      }
    });

    socket.on('joinRoom', (payload, callback) => {
      const roomId = payload && payload.roomId;
      const result = joinRoom(roomId, socket, socket.user);

      if (result.error) {
        if (callback) {
          callback({ error: result.error });
        }
        return;
      }

      const room = result.room;
      socket.data.roomId = room.id;
      socket.join(room.id);
      emitRoomUpdate(io, room);

      if (callback) {
        callback({ roomId: room.id });
      }
    });

    socket.on('startBattle', (payload, callback) => {
      const roomId = socket.data.roomId;
      const room = getRoom(roomId);

      if (!room) {
        if (callback) {
          callback({ error: 'Room not found' });
        }
        return;
      }

      if (room.players.length < 2) {
        if (callback) {
          callback({ error: 'Need two players to start' });
        }
        return;
      }

      if (room.phase !== 'lobby') {
        if (callback) {
          callback({ error: 'Battle already started' });
        }
        return;
      }

      room.phase = 'countdown';
      emitRoomUpdate(io, room);

      room.countdownTimeout = setTimeout(() => {
        if (!rooms.has(room.id)) {
          return;
        }

        room.phase = 'active';
        emitRoomUpdate(io, room);
        room.interval = setInterval(() => tickBattle(io, room), TICK_MS);
      }, COUNTDOWN_MS);

      if (callback) {
        callback({ status: 'countdown' });
      }
    });

    socket.on('skillAction', (payload, callback) => {
      const roomId = socket.data.roomId;
      const room = getRoom(roomId);

      if (!room || room.phase !== 'active') {
        if (callback) {
          callback({ error: 'Battle not active' });
        }
        return;
      }

      const player = room.players.find((p) => p.socketId === socket.id);
      if (!player) {
        if (callback) {
          callback({ error: 'Player not in room' });
        }
        return;
      }

      const applied = processSkillAction(player, payload || {});
      if (callback) {
        callback({ applied });
      }
    });

    socket.on('leaveRoom', (payload, callback) => {
      const roomId = socket.data.roomId;
      const room = leaveRoom(roomId, socket.id);

      socket.data.roomId = null;
      socket.leave(roomId);

      if (!room) {
        if (callback) {
          callback({ status: 'ok' });
        }
        return;
      }

      if (room.players.length === 0) {
        endBattle(io, room, { reason: 'empty', winner: null });
      } else if (room.phase === 'active') {
        endBattle(io, room, { reason: 'player_left', winner: room.players[0].userId });
      } else {
        emitRoomUpdate(io, room);
      }

      if (callback) {
        callback({ status: 'ok' });
      }
    });

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      const room = leaveRoom(roomId, socket.id);

      if (!room) {
        return;
      }

      if (room.players.length === 0) {
        endBattle(io, room, { reason: 'empty', winner: null });
      } else if (room.phase === 'active') {
        endBattle(io, room, { reason: 'player_left', winner: room.players[0].userId });
      } else {
        emitRoomUpdate(io, room);
      }
    });
  });
}

module.exports = initBattleSockets;
