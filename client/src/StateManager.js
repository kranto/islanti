import socketIOClient from "socket.io-client";

class StateManager {

  constructor() {
    this.endpoint = window.location.hostname === 'localhost' ? "http://localhost:4000" : "";
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

  openGameConnection(gameToken, credentials, callback) {
    console.log('openGameConnection', gameToken, credentials);

    this.game = socketIOClient(this.endpoint + "/game/" + gameToken);

    this.game.on('stateChange', args => {
      this.stateChange(args);
    });

    this.game.on('connect', () => {
      console.log('connected');
      this.authenticate(credentials, callback);
    });

    this.game.on('reconnect', () => {
      console.log('reconnected');
    });

    this.game.on('reconnect_attempt', (i) => {
      console.log('attempting to reconnect', i);
    });

    this.game.on('disconnect', () => {
      console.log('disconnected');
    });

    this.game.on('authenticated', () => {
      this.requestFullState();
      callback({connected: true, authenticated: true, msg: "Yhteys ok"});
    });
  }

  closeGameConnection() {
    if (this.game) {
      this.game.close();
      this.game = null;
    }
  }

  authenticate(credentials, callback) {
    this.game.emit('authenticate', credentials, status => callback(status));
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
