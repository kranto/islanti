import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from "react";
import Lobby from './Lobby';
import GameRoom from './GameRoom';
import StateManager from './StateManager';

import { library } from '@fortawesome/fontawesome-svg-core'
import {
  faBars,
  faTimes,
  faSpinner,
  faTrash,
  faWifi,
  faSlash,
  faHeartBroken
} from '@fortawesome/free-solid-svg-icons'
library.add(
  faBars,
  faTimes,
  faSpinner,
  faTrash,
  faWifi,
  faSlash,
  faHeartBroken
)

class App extends Component {

  constructor() {
    super();
    this.stateManager = new StateManager();
    this.state = { inLobby: true, inGame: false, myName: null };

    window.onpopstate = this.onPopState;
  }

  componentDidMount() {
    this.stateManager.initLobby("lobby", (x) => {
      this.setState({ lobbyReady: true });
      window.history.replaceState({game: null, participation: null, lobby: true}, "Liity peliin");
      console.log('In the lobby', x);
    });
  }

  onPopState = (event) => {
    console.log(window.history);
    console.log('onpopstate', event.state);
    if (event.state.game) console.log('liity peliin ' + event.state.game);
    if (event.state.lobby) {
      console.log('palaa lobbyyn', window.history.state);
      this.closeGame();
    }
  }

  goToGame = (gameToken, participation) => {
    console.log('goToGame', gameToken, participation);
    this.stateManager.openGameConnection(gameToken, {participation: participation }, (result) => {
      this.setState({ inLobby: false, inGame: true, myName: result.myName, authenticated: true });
      let newState = {game: gameToken, participation: participation, lobby: false};
      if (window.history.state.game) {
        window.history.replaceState(newState, "");
      } else {
        window.history.pushState(newState, "");
      }
      console.log('App.callback', result);
    });
  }

  exitGame = () => {
    console.log('exitGame');
    this.setState({ inLobby: true, inGame: false });
    this.stateManager.exitGame();
    Lobby.resetParticipation();
    this.stateManager.closeGameConnection();
  }
  
  discardGame = () => {
    console.log('discardGame');
    this.setState({ inLobby: true, inGame: false });
    this.stateManager.discardGame();
    Lobby.resetParticipation();
    this.stateManager.closeGameConnection();
  }
  
  closeGame = () => {
    console.log('closeGame');
    this.setState({ inLobby: true, inGame: false });
    Lobby.resetParticipation();
    this.stateManager.closeGameConnection();
  }
  
  render() {
    document.title = "Islanti";
    return (
      <div className="App">
        {this.state.inLobby ? <Lobby stateManager={this.stateManager} goToGame={this.goToGame} lobbyReady={this.state.lobbyReady}></Lobby> : ""}
        {this.state.inGame ? 
          <>
          <GameRoom 
            stateManager={this.stateManager}
            discardGame={this.discardGame}
            closeGame={this.closeGame}>
          </GameRoom> 
          </>
          : ""}
      </div>
    );
  }
}

export default App;
