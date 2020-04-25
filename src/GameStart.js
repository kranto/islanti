
import React, { Component } from "react";

class GameStart extends Component {

  constructor() {
    super();
    this.state = {
      started: false
    };
  }

  renderTableData = () => {
    let game = this.props.data;
    if (!game) return (<tbody></tbody>);
    return (
      <tbody>
        <tr><th>Kierros</th>{game.players.map((p, i) => (<th key={i}>{p.name}</th>))}</tr>
        {game.score.rounds.map((rs, j) => (<tr key={j}><td key={j} className=".roundName">{game.rounds[j].roundName}</td>
          {rs.map((s, i) => (<td key={j + ":" + i}>{s === null ? (game.players[i].isDealer && j === game.round ? "*" : "-") : s}</td>))}
        </tr>))}
        <tr><th>Yhteensä</th>{game.score.total.map((ts, i) => (<td key={i}>{ts}</td>))}</tr>
      </tbody>
    );
  };

  startGame = () => {
    this.props.onStartGame();
    this.setState({ started: true })
  }

  exitGame = () => {
    if (window.confirm("Haluatko varmasti poistua pelistä?")) {
      this.props.onExitGame();
    }
  }

  render() {
    let game = this.props.data;
    if (!game) return "";
    return (
      <div className={"GameStart " + (this.state.started ? "closed" : "")}>
        <div className="GameSheet">
          <div>
            <h3>Uusi peli alkamassa</h3>
            <div>Pelin osallistumiskoodi {game.code}</div>
            <div>Odotetaan pelaajia.</div>
          </div><div>
            <h3>Pelaajat ({game.players.length})</h3>
            {game.players.map(p => (<div>{p.name}</div>))}
          </div>
          {game.imOwner ?
            <button className="btn btn-dark start-button" onClick={this.startGame}>Kaikki paikalla, aloitetaan</button>
            :
            <button className="btn btn-dark start-button" onClick={this.exitGame}>Älä osallistukaan</button>
          }
        </div>
      </div>
    );
  }
}

export default GameStart;
