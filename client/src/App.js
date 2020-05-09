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
  faSlash
} from '@fortawesome/free-solid-svg-icons'
library.add(
  faBars,
  faTimes,
  faSpinner,
  faTrash,
  faWifi,
  faSlash
)

class App extends Component {

  constructor() {
    super();
    this.stateManager = new StateManager();
    this.state = { inLobby: true, inGame: false, myName: null };
  }

  componentDidMount() {
    this.stateManager.initLobby("lobby", (x) => {
      this.setState({ lobbyReady: true });
      console.log('In the lobby', x);
    });
  }

  goToGame = (gameToken, participation) => {
    console.log('goToGame', gameToken, participation);
    this.stateManager.openGameConnection(gameToken, {participation: participation }, (result) => {
      this.setState({ inLobby: false, inGame: true, myName: result.myName, authenticated: true });
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
