
import React, { Component } from "react";

class ScoreBoard extends Component {

  renderTableData = () => {
    let game = this.props.game;
    if (!game) return (<tbody></tbody>);
    let scores = game.scoreBoard;
    if (!scores) return (<tbody></tbody>);
    let playerNames = game.players.sort((p1, p2) => p1.order < p2.order ? -1 : 1).map(p => p.nick);
    return (
      <tbody>
        <tr><th>Kierros</th>{playerNames.map((p, i) => (<th key={i}>{p}</th>))}</tr>
        {scores.rounds.map((rs, j) => 
          (<tr key={j}>
            <td key={j} className=".roundName">{rs.round.roundName}</td>
            {rs.scores.map((s, i) => (<td key={i}>{s}</td>))}
          </tr>))}
        <tr><th>Yhteensä</th>{scores.total.map((ts, i) => (<td key={i}>{ts}</td>))}</tr>
      </tbody>
    );
  };

  render() {
    return (
      <div className="ScoreBoard">
        <div className="ScoreBoardTable">
          <table className="table table-striped">
            {this.renderTableData()}
          </table>
        </div>
      </div>
    );
  }
}

export default ScoreBoard;
