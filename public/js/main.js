const socket = io();

const createRoomForm = document.getElementById('create-room-form');
const mapScreen = document.getElementById('map-screen');
let map;
let currentRoomId;
let markers = {};

createRoomForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const roomName = document.getElementById('room-name').value;
    const userName = document.getElementById('user-name').value;
    const roomPassword = document.getElementById('room-password').value;
    const roomDuration = document.getElementById('room-duration').value;

    socket.emit('createRoom', { roomName, userName, roomPassword, roomDuration });
});

socket.on('roomCreated', (roomData) => {
    currentRoomId = roomData.roomId;
    showMapScreen(roomData);
});

socket.on('userJoined', (userData) => {
    console.log(`${userData.userName} 님이 방에 참가했습니다.`);
    // 참가자 목록 업데이트 로직 추가
});

socket.on('locationUpdated', (locationData) => {
    updateMarkerPosition(locationData.socketId, locationData.location);
});

socket.on('userLeft', (userData) => {
    console.log(`사용자가 방을 나갔습니다.`);
    removeMarker(userData.socketId);
    // 참가자 목록 업데이트 로직 추가
});

socket.on('error', (errorMessage) => {
    alert(errorMessage);
});

function showMapScreen(roomData) {
    document.getElementById('create-room').style.display = 'none';
    mapScreen.style.display = 'block';
    document.getElementById('room-name-display').textContent = roomData.roomName;
    initMap();
}

function initMap() {
    map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: 37.5665, lng: 126.9780 }, // 서울 중심 좌표
        zoom: 13
    });
    trackLocation();
}

function trackLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            (position) => {
                const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                updateMarkerPosition(socket.id, pos);
                socket.emit('updateLocation', pos);
            },
            () => {
                console.error('위치 정보를 가져올 수 없습니다.');
            }
        );
    } else {
        console.error('브라우저가 위치 정보를 지원하지 않습니다.');
    }
}

function updateMarkerPosition(socketId, position) {
    if (!markers[socketId]) {
        markers[socketId] = new google.maps.Marker({
            position: position,
            map: map
        });
    } else {
        markers[socketId].setPosition(position);
    }
}

function removeMarker(socketId) {
    if (markers[socketId]) {
        markers[socketId].setMap(null);
        delete markers[socketId];
    }
}

// 공유 버튼 클릭 이벤트
document.getElementById('share-button').addEventListener('click', () => {
    const shareUrl = `${window.location.origin}/join/${currentRoomId}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
        alert('초대 링크가 클립보드에 복사되었습니다.');
    }).catch(err => {
        console.error('클립보드 복사 실패:', err);
    });
});

// 나가기 버튼 클릭 이벤트
document.getElementById('leave-button').addEventListener('click', () => {
    socket.emit('leaveRoom');
    window.location.reload();
});