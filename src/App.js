import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from "react";
import CardTable from './CardTable.js';
import StateManager from './StateManager.js';

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
