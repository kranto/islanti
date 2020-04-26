
import React, { Component } from "react";

class ScoreBoard extends Component {

  constructor() {
    super();
    this.state = {
      closed: false
    };
  }

  renderTableData = () => {
    let game = this.props.game;
    console.log(game);
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

  close = () => {
    this.props.onScoreBoardClosed();
    this.setState({ closed: true })
  }

  render() {
    return (
      <div className={"ScoreBoard " + (this.state.closed ? "closed" : "")}>
        <div className="ScoreSheet">
          <div className="ScoreBoardTable">
            <table className="table table-striped">
              {this.renderTableData()}
            </table>
          </div>
          <button className="btn btn-dark" onClick={this.close}>Peliin</button>
        </div>
      </div>
    );
  }
}

export default ScoreBoard;
