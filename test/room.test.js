const mongoose = require('mongoose');
const Room = require('../server/models/Room');

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Room Model Test', () => {
  it('create & save room successfully', async () => {
    const roomData = {
      name: 'Test Room',
      password: 'password123',
      createdBy: 'TestUser',
      duration: 60,
      expiresAt: new Date(Date.now() + 60 * 60000),
      participants: [{
        name: 'TestUser',
        socketId: 'test-socket-id',
        location: { lat: 37.5665, lng: 126.9780 }
      }]
    };
    const validRoom = new Room(roomData);
    const savedRoom = await validRoom.save();
    
    expect(savedRoom._id).toBeDefined();
    expect(savedRoom.name).toBe(roomData.name);
    expect(savedRoom.participants.length).toBe(1);
  });

  // 여기에 추가 테스트 케이스를 작성할 수 있습니다.
});