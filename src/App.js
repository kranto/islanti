import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from "react";
import CardTable from './CardTable.js';
import game from './game';


class App extends Component {

  constructor() {
    super();
    this.cardTable = React.createRef();
    this.simulateOthers = this.simulateOthers.bind(this);
    this.dealMyTurn = this.dealMyTurn.bind(this);
    this.dealOthers = this.dealOthers.bind(this);
  }

  simulateOthers() {
    this.cardTable.current.simulateOthers();
  }

  dealMyTurn() {
    this.cardTable.current.deal(true);
  }

  dealOthers() {
    this.cardTable.current.deal(false);
  }

  render() {
      return (
      <div className="App">
        <div>
          <button onClick={() => this.cardTable.current.deal(true)}>Jaa, minä aloitan</button>
          <button onClick={() => this.cardTable.current.deal(false)}>Jaa, joku muu aloittaa</button>
          <button onClick={() => this.cardTable.current.otherShowCard()}>Joku muu aloittaa</button>
          <button onClick={() => this.cardTable.current.simulateOthers()}>Pelaa muiden vuorot</button>
          <button onClick={() => this.cardTable.current.takeTurn()}>Ota vuoro</button>
        </div>
        <CardTable ref={this.cardTable}></CardTable>
      </div>
    );
  }
}

export default App;
