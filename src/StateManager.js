import socketIOClient from "socket.io-client";

class StateManager {

  constructor() {
    this.endpoint = window.location.hostname === 'localhost' ? "http://localhost:4000" : "";
  }

  initSocket(gameId, credentials, callback) {
    console.log('initSocket', this.socket);
    // if (this.socket) return;
    // console.log('initSocket contd');

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.socket = socketIOClient(this.endpoint + "/game/" + gameId);

    this.socket.on('stateChange', args => {
      this.stateChange(args);
    });

    this.socket.on('connect', () => {
      console.log('connected');
      this.authenticate(credentials, callback);
    });

    this.socket.on('reconnect', () => {
      console.log('reconnected');
    });

    this.socket.on('reconnect_attempt', (i) => {
      console.log('attempting to reconnect', i);
    });

    this.socket.on('disconnect', () => {
      console.log('disconnected');
    });

    this.socket.on('authenticated', () => {
      this.requestFullState();
      callback({connected: true, authenticated: true, msg: "Yhteys ok"});
    });
  }

  authenticate(credentials, callback) {
    this.socket.emit('authenticate', credentials, isOk => callback({authenticationStatus: isOk}));
  }

  requestFullState() {
    this.socket.emit('state');
  }

  getState() {
    return this.state;
  }

  stateChange(params) {
    console.log('StateManager.stateChange', params);
    switch(params.action) {
      case 'fullState': 
        this.state = params.state;
        let event = new CustomEvent('stateChange', { detail: {action: 'fullState', state: params.state}});
        document.dispatchEvent(event);
        break;
    }
  }

  testSeries(index, callback) {
    console.log('testSeries', index);
    this.socket.emit('testSeries', {sectionIndex: index}, callback);
  }
  
  sendAction(action, params) {
    params = params || {};
    console.log('sendAction', action, params);
    this.socket.emit('action', {...params, action: action});
  }

  subscribeTo(eventType, callback) {
    document.addEventListener(eventType, (event) => {
      callback(event.detail);
    });  
  }
}

export default StateManager;
