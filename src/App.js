import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from "react";
import GameRoom from './GameRoom.js';
import CardTable from './CardTable.js';
import StateManager from './StateManager.js';

class App extends Component {

  constructor() {
    super();
    this.stateManager = new StateManager();
    this.state = { inLobby: true, inGame: false, myName: null };
  }

  componentDidMount() {
    console.log('App did mount');

    let search = window.location.search;
    let code = search ? decodeURIComponent(search.substring(1)) : "guest";
    console.log(code);

    this.stateManager.initLobby("lobby", (x) => {
      this.setState({ lobby: true });
      console.log('In the lobby', x);
    });
  }

  goToGame = (params) => {
    console.log('goToGame', params);
    this.stateManager.initGameSocket("dev", { code: "2" }, (result) => {
      this.setState({ inLobby: false, inGame: true, myName: result.myName, authenticated: true });
      console.log('App.callback', result);
    });
  }

  render() {
    document.title = "Islanti / " + this.state.myName;
    return (
      <div className="App">
        <div>
        </div>
        {this.state.inLobby ? <GameRoom stateManager={this.stateManager} goToGame={this.goToGame}></GameRoom> : ""}
        {this.state.inGame ? <CardTable stateManager={this.stateManager}></CardTable> : ""}
      </div>
    );
  }
}

export default App;
