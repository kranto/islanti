import './App.css';
import React, { Component } from "react";
import CardTable from './CardTable.js';


class App extends Component {

  render() {
    return (
      <div className="App">
        <div style={{height: "100px", width: "100px"}}>here</div>
        <CardTable></CardTable>
      </div>
    );
  }
}

export default App;
