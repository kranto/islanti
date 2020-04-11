import socketIOClient from "socket.io-client";

class StateManager {

  constructor() {
    this.endpoint = window.location.hostname === 'localhost' ? "http://localhost:4000" : "";
  }

  initSocket() {
    console.log('initSocket', this.socket);
    if (this.socket) return;
    console.log('initSocket contd');

    this.socket = socketIOClient(this.endpoint + "/game/dev");

    // game.init(this.socket);

    this.socket.on('stateChange', args => {
      this.stateChange(args);
    });

    this.socket.on('connect', () => {
      console.log('connected');
      this.authenticate();
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

    this.socket.on('authenticated', () => this.requestFullState());
  }

  authenticate() {
    let hash = window.location.hash;
    let id = hash && hash.length > 2 ? hash[2] : "0";
    this.socket.emit('authenticate', id);
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

  sendAction(action, params) {
    params = params || {};
    this.socket.emit('action', {...params, action: action});
  }

  subscribeTo(eventType, callback) {
    document.addEventListener(eventType, (event) => {
      callback(event.detail);
    });  
  }
}

export default StateManager;
