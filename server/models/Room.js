const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  password: { type: String, required: true },
  createdBy: { type: String, required: true },
  duration: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
  participants: [{
    name: String,
    socketId: String,
    location: {
      lat: Number,
      lng: Number
    }
  }]
});

module.exports = mongoose.model('Room', RoomSchema);