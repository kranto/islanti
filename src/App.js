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
    this.state = { name: "tunnistaudu", authenticated: false};
  }

  componentDidMount() {
    console.log('App did mount');

    let search = window.location.search;
    let code = search ? decodeURIComponent(search.substring(1)) : "guest";
    console.log(code);
    this.stateManager.initSocket("dev", {code: code, secret: "nothing"}, (x) => {
      this.setState({name: x.myName, authenticated: true});
      console.log('App.callback', x);
    });
  }

  render() {
    document.title = "Islanti / " + this.state.name;
      return (
      <div className="App">
        <div>
        </div>
        {/* <GameRoom></GameRoom> */}
        <CardTable stateManager={this.stateManager}></CardTable>
      </div>
    );
  }
}

export default App;
