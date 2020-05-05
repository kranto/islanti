
import React, { Component } from "react";

class GameStart extends Component {

  constructor() {
    super();
    this.state = {
      started: false
    };
  }

  static getDerivedStateFromProps(props, state) {
    return {started: props.game && props.game.locked}
  }

  renderTableData = () => {
    let game = this.props.game;
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

  discardGame = () => {
    if (window.confirm("Haluatko varmasti hylätä tämän pelin?")) {
      this.props.onDiscardGame();
    }
  }

  render() {
    let game = this.props.game;
    if (!game) return "";
    return (
      <div className={"GameStart " + (this.state.started ? "closed" : "")}>
        <div className="GameSheet">
          <div>
            <h3>Uusi peli alkamassa</h3>
            <div>
              Pelin osallistumiskoodi <b>{game.code}</b>
              {game.imOwner ? <span>. 
              Kerro osallistumiskoodi pelaajille.</span> : ""}
            </div>
            <div>Odotetaan pelaajien liittymistä.</div>
          </div><div>
            <h3>Pelaajat ({game.players.length})</h3>
            {game.players.map((p, i) => (<div key={i}>{p.nick}</div>))}
          </div>
          {game.imOwner ?
            <div style={{display: 'flex', flexFlow: "row nowrap", justifyContent: "space-around", minWidth: "80%" }}>
              <button className="btn btn-secondary" onClick={this.discardGame}>Hylkää peli</button>
              <button className="btn btn-dark" onClick={this.startGame}>Kaikki paikalla, aloitetaan</button>
            </div>
            :
            <button className="btn btn-dark" onClick={this.exitGame}>Älä osallistukaan</button>
          }
        </div>
      </div>
    );
  }
}

export default GameStart;
