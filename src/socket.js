const jwt = require('jsonwebtoken');
const Booking = require('./models/Booking');

function bookingRoom(bookingId) {
  return `booking:${bookingId}`;
}

function initSocket(io) {
  io.on('connection', (socket) => {
    let account = null; // { id, role }

    try {
      const token = socket.handshake.auth?.token;
      account = token ? jwt.verify(token, process.env.JWT_SECRET) : null;
    } catch (err) {
      socket.emit('error', { message: 'Invalid token' });
      socket.disconnect();
      return;
    }

    if (!account) {
      socket.emit('error', { message: 'Token is required to connect' });
      socket.disconnect();
      return;
    }

    socket.on('join-booking', async (bookingId) => {
      const filter = account.role === 'provider' ? { _id: bookingId, provider: account.id } : { _id: bookingId, user: account.id };
      const booking = await Booking.findOne(filter);
      if (!booking) {
        socket.emit('error', { message: 'Booking not found or not yours' });
        return;
      }
      socket.join(bookingRoom(bookingId));
    });

    socket.on('leave-booking', (bookingId) => {
      socket.leave(bookingRoom(bookingId));
    });
  });
}

module.exports = { initSocket, bookingRoom };
