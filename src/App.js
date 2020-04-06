import './App.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from "react";
import CardTable from './CardTable.js';


class App extends Component {

  constructor() {
    super();
    this.cardTable = React.createRef();
    this.simulateOthers = this.simulateOthers.bind(this);
  }

  simulateOthers() {
    this.cardTable.current.simulateOthers();
  }

  render() {
    return (
      <div className="App">
        <div>
          <button onClick={this.simulateOthers}>Pelaa muiden vuorot</button>
        </div>
        <CardTable ref={this.cardTable}></CardTable>
      </div>
    );
  }
}

export default App;
