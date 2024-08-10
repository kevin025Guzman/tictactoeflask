import { addMsg } from './helpers-chat.js';

// ! VARIABLES DECLARATIONS
const winningMessageElement = document.getElementById('winningMessage');
const winningMessageTextElement = document.querySelector('[data-winning-message-text]');
const board = document.getElementById('board');
const startGameButton = document.getElementById('gameStart');
const roomName = document.getElementById('gameRoom');
const playerName = document.getElementById('playerName');
const connectedContainer = document.getElementById('connected_players');
const cellElements = document.querySelectorAll('[data-cell]');
const restartButton = document.getElementById('restartButton');
const gameRoomTitle = document.querySelector('.modal-header-title')
const joinButton = document.getElementById('joinRoom')
const sendButton = document.getElementById('send')
const X_CLASS = 'x';
const CIRCLE_CLASS = 'circle';
const WINNING_COMBINATIONS = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

document.addEventListener("DOMContentLoaded", function(event) { 

var clientId = '';
var activeId = '';
var player1 = "";
var player2 = "";


var socket = null

joinButton.addEventListener('click', async function(event) {
  event.preventDefault();
  
  const connectionEstablished = await connectUser();
  let result;
  if (connectionEstablished) {
    if (playerName.value == '' || roomName.value == '') {
      setTimeout(() => {
        alert('Complete los campos Nombre de la sala y Nombre del jugador!');
      }, "700")  
      return;
    } else {
      result = await roomAvalability(); 
    };
  };

  
  if (result == 'tooCrowdy'){
    // disconnect the socket
    socket.disconnect();
    alert('Demasiados jugadores en esta sala de juegos!');
    return;
  } else {
    socket.emit('readyToStart');

    userConnectedHandlers();
    document.getElementById('greetingsBackground').classList.remove('show');
  }; 
});

function connectUser() {
  return new Promise(function (resolve, reject) {
    socket = io()
    socket.on('connection-established', result => {
      socket.off('connection-established');
      resolve(result);
    });
    setTimeout(reject, "700");
  });
};


function roomAvalability() {
  return new Promise(function (resolve, reject) {
    socket.emit('check-game-room', { username: playerName.value, room : roomName.value});
    
    socket.on('tooManyPlayers', result => {
      socket.off('tooManyPlayers');
      resolve(result);
    });
    setTimeout(reject, "700");
  });
};





function userConnectedHandlers() {

  

  console.log('Connection established!');

 
  socket.on('clientId', setClientId)
  
  
  socket.on('connected-Players', getConnectedPlayers);


  socket.on('status', function(msg) {
    console.log(msg + " functon msg")
    console.log (`Last joined: ${msg['clientId']} || Clients Nbr.:${msg['clientsNbs']}`);
    
    let servermsg = `Jugadores conectados: ${msg['clientsNbs']}`;
    addMsg(servermsg, 'msg-container center', 'msg-content refer');

  });


  socket.on('disconnect-status', function(msg) {

    console.log (`Player: ${msg['clientId']} left the room. || Clients Nbr.:${msg['clientsNbs']}`);
      
    let servermsg = `Jugador ${msg['clientId']}, salio de la sala. Jugadores conectados: ${msg['clientsNbs']}`;
    addMsg(servermsg, 'msg-container center', 'msg-content refer');
  });

  
  socket.on('player message', updateChatView);

 
  socket.on('start', (data) => {
    activeId = data['activePlayer'];
    let readyToStart = data['started'];
      console.log('Active user: ', activeId );
     
    let txtmsg = (clientId == activeId) ? `Usuario activo: ${activeId} (tu turno)`: `Usuario activo: ${activeId} (turno del oponente)` ;
    addMsg(txtmsg, 'msg-container center', 'msg-content refer');
    startGame();
  });

 
  socket.on('waiting second player start', (data) => {
    let txtmsg = `Esperando el inicio del segundo jugador ...`;
    addMsg(txtmsg, 'msg-container center', 'msg-content refer');
  });


 
  socket.on('turn', (turn) => {
    // let {recentPlayer, position, next} = turn;
    let currentMark = (turn['recentPlayer'] == 0) ? CIRCLE_CLASS : X_CLASS;
    console.log(`ultima posision para ${turn['recentPlayer']}, es ${turn['lastPos']}`);

    let txtmsg = `Last Position by ${turn['recentPlayer']}, is ${turn['lastPos']}`;
    /* addMsg(txtmsg, 'msg-container center', 'msg-content refer'); */                  // MSG
    placeMark(cellElements[turn['lastPos']], currentMark); 

    if (checkWin(currentMark)) {
      endGame(false, currentMark);
      socket.emit('game_status', {'status': 'Win' , 'player':turn['recentPlayer']});
    } else if (isDraw()) {
      endGame(true);
      socket.emit('game_status', {'status': 'Draw' , 'player':turn['recentPlayer']});

    }
    activeId = turn['next'];
  });


//});  // END of event.on('user-connected')

}; // END of function userConnected


sendButton.addEventListener('click', sendUserMsg);

// event(2): user pushed the StartGame button 
// emited events: startGame(msg)
startGameButton.addEventListener('click', function(){
  socket.emit('startGame', {'clientId':clientId});
})

// event(4): send restart intention to server
// emited events: restartGame(msg) intention
restartButton.addEventListener('click', function() {
  socket.emit('startGame', {'clientId':clientId});
  // startGame()
});

// ! GAME LOGIC

function startGame() {
  cellElements.forEach(cell => {
    cell.classList.remove(X_CLASS);
    cell.classList.remove(CIRCLE_CLASS);
    
    cell.removeEventListener('click', handleClick);
    cell.addEventListener('click', handleClick);
  })
  let playerMark = (clientId == 0) ?  true : false;
  setBoardHoverClass(playerMark);
  winningMessageElement.classList.remove('show');
}

function handleClick(e) {
  let cell = e.target;
  let currentMark = (clientId == 0) ? CIRCLE_CLASS : X_CLASS;
  if (activeId == clientId){
    placeMark(cell, currentMark);
    turn(e);
  }
  if (checkWin(currentMark)) {
    endGame(false, currentMark);
  } else if (isDraw()) {
    endGame(true);
  }  
  console.log('clicked index: ', getIdx(e));
  
}

// HELPERS

function placeMark(cell, currentClass) {
  cell.classList.add(currentClass)};

// event(3): startGame() -> at player click -> <turn> event
// send turn event to server // emited events: turn(msg)
function turn(e) {
  let pos = getIdx(e);
  console.log('send');
  socket.emit("turn", {"pos": pos, "player": activeId});
}

function setBoardHoverClass(clientIdClass) {
  board.classList.remove(X_CLASS);
  board.classList.remove(CIRCLE_CLASS);
  if (clientIdClass) {
    board.classList.add(CIRCLE_CLASS);
  } else {
    board.classList.add(X_CLASS);
  }
};

function getIdx(e){
  let clickedtargetParent = e.target.parentElement;
  let idx = Array.prototype.indexOf.call(clickedtargetParent.children, e.target);
  return idx;
}


function endGame(draw, currentMark) {
  if (draw) {
    winningMessageTextElement.innerText = 'Empate!';
  } else {
    winningMessageTextElement.innerText = `${(currentMark == 'circle') ? "El O" : "La X"} Gana!`;
  }
  winningMessageElement.classList.add('show');
}

function isDraw() {
  return [...cellElements].every(cell => {
    return cell.classList.contains(X_CLASS) || cell.classList.contains(CIRCLE_CLASS);
  });
};

function checkWin(currentClass) {
  return WINNING_COMBINATIONS.some(combination => {
    return combination.every(index => {
      return cellElements[index].classList.contains(currentClass);
    });
  });
};

//////////////////////////////////////////////////////

function sendUserMsg(event) {
  event.preventDefault()
  if (document.getElementById('message').value === ''){
    return;
  }
  socket.emit('my_broadcast_event', {data: document.getElementById('message').value, sender: clientId});
  document.getElementById('message').value = '';
};

function updateChatView(msg) {  
  let txtmsg = `${msg.data}`;
  if (msg.sender == clientId){
    addMsg(txtmsg, 'msg-container right', 'msg-content refer');
  } else{
    addMsg(txtmsg, 'msg-container', 'msg-content');
  }
};


function setClientId(id, room) {
  // hadler (1.2): Event handler for server sent data // get client id

  clientId = id;
  let modalRoomName = `Nombre de Sala [${room}]`;
  gameRoomTitle.innerText = modalRoomName;

  let mark = (clientId == 0) ? CIRCLE_CLASS : X_CLASS;
  console.log('Clog: Recibido el ID del jugador: ', id);

  let txtmsg = `ID del jugador: ${id}`;
  addMsg(txtmsg, 'msg-container center', 'msg-content refer');
};


function getConnectedPlayers(players) {
    // hadler (1.2'): Event handler for server sent data // get connected-Players
    let connectedPlayers = [];
    for (var i = 0; i < players[0].length; i++) {
      connectedPlayers.push(players[0][i]);
      player1 = players[0][i];
    };
    console.log(connectedPlayers);
    connectedContainer.innerText = `Online: ${connectedPlayers}`;
    player1 = connectedPlayers[0]
    
};

});