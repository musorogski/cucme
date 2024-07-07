const express = require('express');
const router = express.Router();

router.post('/create-room', (req, res) => {
  // 방 생성 API 로직
});

router.post('/join-room', (req, res) => {
  // 방 참가 API 로직
});

module.exports = router;