import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from "react";
import CardTable from './CardTable.js';
// import * as $ from 'jquery';

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
          {/* <button onClick={() => game.moveOther(Math.floor(Math.random()*3), Math.floor(Math.random()*13), Math.floor(Math.random()*13))}>Järjestä</button>
          <button onClick={() => game.pickFromDeck(Math.floor(Math.random()*3))}>Nosta pakasta</button>
          <button onClick={() => game.pickFromPile(Math.floor(Math.random()*3))}>Nosta avopakasta</button> */}

          <button onClick={() => this.cardTable.current.deal()}>Jaa kortit</button>
          <button onClick={() => this.cardTable.current.showCard()}>Aloita</button>
          <button onClick={() => this.cardTable.current.simulateOthers()}>Pelaa muiden vuorot</button>
          <button onClick={() => this.cardTable.current.takeTurn()}>Ota vuoro</button>
        </div>
        <CardTable ref={this.cardTable}></CardTable>
      </div>
    );
  }
}

export default App;
