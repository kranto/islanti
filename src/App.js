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

    this.stateManager.initLobby("lobby", (x) => {
      this.setState({ lobbyReady: true });
      console.log('In the lobby', x);
    });
  }

  goToGame = (gameToken, participation) => {
    console.log('goToGame', gameToken, participation);
    this.stateManager.initGame(gameToken, {participation: participation }, (result) => {
      this.setState({ inLobby: false, inGame: true, myName: result.myName, authenticated: true });
      console.log('App.callback', result);
    });
  }

  exitGame = () => {
    console.log('exitGame');
    this.setState({ inLobby: true, inGame: false });
    this.stateManager.exitGame();
    Lobby.resetState();
    this.stateManager.closeGame();
  }
  
  abandonGame = () => {
    console.log('abandonGame');
    this.setState({ inLobby: true, inGame: false });
    this.stateManager.abandonGame();
    Lobby.resetState();
    this.stateManager.closeGame();
  }
  
  render() {
    document.title = "Islanti";
    return (
      <div className="App">
        {this.state.inLobby ? <Lobby stateManager={this.stateManager} goToGame={this.goToGame} lobbyReady={this.state.lobbyReady}></Lobby> : ""}
        {this.state.inGame ? <GameRoom stateManager={this.stateManager} abandonGame={this.abandonGame} exitGame={this.exitGame}></GameRoom> : ""}
      </div>
    );
  }
}

export default App;
