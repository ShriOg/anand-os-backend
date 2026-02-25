const rooms = new Map();

function generateRoomId() {
  return `room_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function createPlayer(socket, user) {
  const userId = user.id || user._id || user.sub || user.userId || socket.id;
  const username = user.username || user.name || user.email || 'Player';

  return {
    socketId: socket.id,
    userId,
    username,
    base: { power: 100, stability: 100 },
    live: { energy: 100, combo: 1.0, reactionScore: 0, lastActionAt: 0 }
  };
}

function createRoom(socket, user) {
  const id = generateRoomId();
  const room = {
    id,
    players: [createPlayer(socket, user)],
    phase: 'lobby',
    dominance: 0,
    energy: { p1: 100, p2: 100 },
    interval: null,
    countdownTimeout: null
  };

  rooms.set(id, room);
  return room;
}

function joinRoom(roomId, socket, user) {
  const room = rooms.get(roomId);

  if (!room) {
    return { error: 'Room not found' };
  }

  if (room.players.length >= 2) {
    return { error: 'Room is full' };
  }

  if (room.phase !== 'lobby') {
    return { error: 'Room is not joinable' };
  }

  room.players.push(createPlayer(socket, user));
  return { room };
}

function getRoom(roomId) {
  return rooms.get(roomId);
}

function removeRoom(roomId) {
  rooms.delete(roomId);
}

function leaveRoom(roomId, socketId) {
  const room = rooms.get(roomId);
  if (!room) {
    return null;
  }

  room.players = room.players.filter((player) => player.socketId !== socketId);
  return room;
}

module.exports = {
  rooms,
  createRoom,
  joinRoom,
  getRoom,
  removeRoom,
  leaveRoom
};
