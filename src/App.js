import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from "react";
import CardTable from './CardTable.js';
// import * as $ from 'jquery';
import StateManager from './StateManager.js';
import game from './game';

class App extends Component {

  constructor() {
    super();
    this.cardTable = React.createRef();

    this.stateManager = new StateManager();
  }

  componentDidMount() {
    console.log('App did mount');

    let hash = window.location.hash;
    let id = hash && hash.length > 2 ? hash[2] : "0";

    this.stateManager.initSocket("dev", {id: id, secret: "nothing"}, (x) => console.log('App.callback', x) );

    game.init(this.stateManager);
  }

  render() {
      return (
      <div className="App">
        <div>
        </div>
        <CardTable ref={this.cardTable} stateManager={this.stateManager}></CardTable>
      </div>
    );
  }
}

export default App;
