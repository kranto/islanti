import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from "react";
import Lobby from './Lobby.js';
import GameRoom from './GameRoom.js';
import StateManager from './StateManager.js';

class App extends Component {

  constructor() {
    super();
    this.stateManager = new StateManager();
    this.state = { inLobby: true, inGame: false, myName: null };
  }

  componentDidMount() {
    let search = window.location.search;
    let code = search ? decodeURIComponent(search.substring(1)) : "guest";
    console.log(code);

    this.stateManager.initLobby("lobby", (x) => {
      this.setState({ lobbyReady: true });
      console.log('In the lobby', x);
    });
  }

  goToGame = (gameToken, participationId) => {
    console.log('goToGame', gameToken, participationId);
    this.stateManager.initGame(gameToken, { code: "2", participationId: participationId }, (result) => {
      this.setState({ inLobby: false, inGame: true, myName: result.myName, authenticated: true });
      console.log('App.callback', result);
    });
  }

  exitGame = () => {
    console.log('exitGame');
    this.setState({ inLobby: true, inGame: false });
    Lobby.resetState();
    this.stateManager.closeGame();
  }
  
  render() {
    document.title = "Islanti";
    return (
      <div className="App">
        {this.state.inLobby ? <Lobby stateManager={this.stateManager} goToGame={this.goToGame} lobbyReady={this.state.lobbyReady}></Lobby> : ""}
        {this.state.inGame ? <GameRoom stateManager={this.stateManager} exitGame={this.exitGame}></GameRoom> : ""}
      </div>
    );
  }
}

export default App;
