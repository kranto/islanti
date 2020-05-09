import socketIOClient from "socket.io-client";

class StateManager {

  constructor() {
    this.endpoint = "";
    this.state = {};
  }

  async initLobby(lobbyName, callback) {
    console.log('initLobby', lobbyName);

    if (this.lobby) {
      this.lobby.close();
      this.lobby = null;
    }

    this.lobby = await socketIOClient(this.endpoint + "/lobby");

    this.lobby.on('connect', () => {
      console.log('connected to lobby');
      callback({connected: true, msg: "Yhteys ok"});
    });

    this.lobby.on('reconnect', () => {
      console.log('reconnected to lobby');
    });

    this.lobby.on('reconnect_attempt', (i) => {
      console.log('attempting to reconnect to lobby', i);
    });

    this.lobby.on('disconnect', () => {
      console.log('disconnected from lobby');
    });
  }

  findGame(code, callback) {
    this.lobby.emit('findGame', {code: code}, (result) => {
      console.log('findGame result', result);
      callback(result);
    });
  }

  createGame(nick, callback) {
    this.lobby.emit('createGame', {nick: nick}, (result) => {
      console.log('createGame result', result);
      callback(result);
    });
  }

  joinGame(game, nick, callback) {
    this.lobby.emit('joinGame', {game: game, nick: nick}, (result) => {
      console.log('joinGame result', result);
      callback(result);
    });
  }

  exitGameWithToken(participation, callback) {
    console.log('exiting', participation);
    this.lobby.emit('exitGame', {participation: participation}, (result) => {
      console.log('exitGame result', result);
      callback(result);
    });
  }
  
  resumeParticipation(participation, callback) {
    this.lobby.emit('resumeParticipation', {participation: participation}, (result) => {
      console.log('resumeParticipation result', result);
      callback(result);
    });
  }

  validateParticipations(participations, callback) {
    this.lobby.emit('validateParticipations', {participations: participations}, (result) => {
      console.log('validateParticipations result', result);
      callback(result);
    });
  }

  gameConnection = false;
  pingInterval = null;

  reopenGameSocket() {

    this.closeGameConnection();

    this.game = socketIOClient(this.endpoint + "/game/" + this.gameToken);

    this.game.on('stateChange', args => {
      this.stateChange(args);
    });

    this.game.on('connect', () => {
      console.log('connect');
      this.authenticate();
    });

    this.game.on('reconnect', async () => {
      console.log('reconnect', this);

    });

    this.game.on('reconnect_attempt', (i) => {
      console.log('attempting to reconnect', i);
    });

    this.game.on('disconnect', () => {
      this.onGameConnectionChange(false);
      console.log('disconnected');
    });

    this.game.on('authenticated', () => {
      this.onGameConnectionChange(true);
      this.requestFullState();
      this.callback({connected: true, authenticated: true, msg: "Yhteys ok"});
    });

    this.game.on('pong1', () => {
      this.lastPong = new Date().getTime();
    });

    this.lastPong = new Date().getTime();
    this.pingInterval = setInterval(() => {
      this.game.emit('ping1');
      this.onGameConnectionChange(this.lastPong > new Date().getTime() - 2500);
    }, 2000);

  }

  openGameConnection(gameToken, credentials, callback) {
    this.gameToken = gameToken;
    this.credentials = credentials;
    this.callback = callback;
    console.log('openGameConnection', gameToken, credentials);
    this.reopenGameSocket();
  }

  onGameConnectionChange(connected) {
    if (this.gameConnection !== connected) {
      this.gameConnection = connected;
      document.dispatchEvent(new CustomEvent('gameConnectionChange'));  
    }
  }

  closeGameConnection() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.game) {
      this.game.close();
      this.game = null;
    }
  }

  authenticate() {
    console.log('authenticating');
    this.game.emit('authenticate', this.credentials, this.callback);
  }

  requestFullState() {
    this.game.emit('state');
  }

  stateChange(params) {
    console.log('StateManager.stateChange', params);
    switch(params.action) {
      case 'gameState':
        this.state.gameState = params.state;
        document.dispatchEvent(new CustomEvent('gameStateChange'));
        break;
      case 'round':
        this.state.round = params.state;
        document.dispatchEvent(new CustomEvent('roundChange'));
        break;
      case 'roundState':
        this.state.roundState = params.state;
        document.dispatchEvent(new CustomEvent('roundStateChange'));
        break;
      default:
        break;
    }
  }

  validateSelection(indices, callback) {
    console.log('validateSelection', indices);
    this.game.emit('validateSelection', {selectedIndices: indices}, callback);
  }
  
  sendAction(action, params) {
    console.log('sendAction', action, params);
    params = params || {};
    this.game.emit('action', {...params, action: action});
  }

  exitGame() {
    this.game.emit('exitGame');
  }
  
  discardGame() {
    this.game.emit('discardGame');
  }
  
  sendGameAction(action, params) {
    console.log('sendGameAction', action, params);
    params = params || {};
    this.game.emit('gameAction', {...params, action: action});
  }

  subscribeTo(eventType, callback) {
    document.addEventListener(eventType, callback);
  }

  unsubscribe(eventType, callback) {
    document.removeEventListener(eventType, callback);
  }
}

export default StateManager;
