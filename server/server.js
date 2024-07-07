require('dotenv').config();

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const path = require('path');
const Room = require('./models/Room');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });

mongoose.connect('mongodb://localhost:27017/cucme', { useNewUrlParser: true, useUnifiedTopology: true });

app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

const apiRoutes = require('./routes/api');
app.use('/api', apiRoutes);

async function cleanExpiredRooms() {
    try {
      const result = await Room.deleteMany({ expiresAt: { $lt: new Date() } });
      console.log(`${result.deletedCount} 개의 만료된 방이 삭제되었습니다.`);
    } catch (error) {
      console.error('만료된 방 삭제 중 오류 발생:', error);
    }
  }
  
  // 1분마다 만료된 방 체크 및 삭제
  setInterval(cleanExpiredRooms, 60000);

io.on('connection', (socket) => {
  console.log('새로운 사용자가 연결되었습니다.');

  socket.on('createRoom', async (roomData) => {
    try {
      const hashedPassword = await bcrypt.hash(roomData.roomPassword, 10);
      const expiresAt = new Date(Date.now() + roomData.roomDuration * 60000);
      
      const newRoom = new Room({
        name: roomData.roomName,
        password: hashedPassword,
        createdBy: roomData.userName,
        duration: roomData.roomDuration,
        expiresAt: expiresAt,
        participants: [{
          name: roomData.userName,
          socketId: socket.id,
          location: null
        }]
      });

      await newRoom.save();
      socket.join(newRoom._id.toString());
      io.to(socket.id).emit('roomCreated', { roomId: newRoom._id, roomName: newRoom.name });
    } catch (error) {
      console.error('방 생성 오류:', error);
      io.to(socket.id).emit('error', '방 생성에 실패했습니다.');
    }
  });

  socket.on('joinRoom', async (joinData) => {
    try {
      const room = await Room.findById(joinData.roomId);
      if (!room) {
        return io.to(socket.id).emit('error', '존재하지 않는 방입니다.');
      }

      const isPasswordValid = await bcrypt.compare(joinData.password, room.password);
      if (!isPasswordValid) {
        return io.to(socket.id).emit('error', '비밀번호가 일치하지 않습니다.');
      }

      if (room.participants.length >= 3) {
        return io.to(socket.id).emit('error', '방이 가득 찼습니다.');
      }

      room.participants.push({
        name: joinData.userName,
        socketId: socket.id,
        location: null
      });
      await room.save();

      socket.join(room._id.toString());
      io.to(room._id.toString()).emit('userJoined', { userName: joinData.userName });
      io.to(socket.id).emit('joinedRoom', { roomId: room._id, roomName: room.name });
    } catch (error) {
      console.error('방 참가 오류:', error);
      io.to(socket.id).emit('error', '방 참가에 실패했습니다.');
    }
  });

  socket.on('updateLocation', async (locationData) => {
    try {
      const room = await Room.findOne({ 'participants.socketId': socket.id });
      if (room) {
        const participant = room.participants.find(p => p.socketId === socket.id);
        if (participant) {
          participant.location = locationData;
          await room.save();
          io.to(room._id.toString()).emit('locationUpdated', { socketId: socket.id, location: locationData });
        }
      }
    } catch (error) {
      console.error('위치 업데이트 오류:', error);
    }
  });

  socket.on('disconnect', async () => {
    try {
      const room = await Room.findOne({ 'participants.socketId': socket.id });
      if (room) {
        room.participants = room.participants.filter(p => p.socketId !== socket.id);
        if (room.participants.length === 0) {
          await Room.findByIdAndDelete(room._id);
        } else {
          await room.save();
          io.to(room._id.toString()).emit('userLeft', { socketId: socket.id });
        }
      }
    } catch (error) {
      console.error('연결 종료 오류:', error);
    }
    console.log('사용자가 연결을 종료했습니다.');
  });
});

server.listen(PORT, () => {
  console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});