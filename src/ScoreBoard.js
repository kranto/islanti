
import React, { Component } from "react";

class ScoreBoard extends Component {

  constructor() {
    super();
    this.state = {
      closed: false
    };
  }

  renderTableData = () => {
    return (
      <tbody>
        <tr><th>Kierros</th>{this.props.data.players.map(p => (<th>{p}</th>))}</tr>
        {this.props.data.rounds.map((r, i) => (<tr><td className=".roundName">{r.roundName}</td>
        {this.props.data.players.map(p => (<td>0</td>))}
        </tr>))}
        <tr><th>Yhteensä</th>{this.props.data.players.map(p => (<td>0</td>))}</tr>
      </tbody>
    );
  };

  close = () => {
    console.log('close');
    this.props.onScoreBoardClosed();
    this.setState({ closed: true })
  }

  render() {
    return (
      <div className={"ScoreBoard " + (this.state.closed ? "closed" : "")}>
        <div className="ScoreBoardTable">
        <table className="table table-striped">
            {this.renderTableData()}
        </table>
        </div>
        <button onClick={this.close}>Peliin</button>
      </div>
    );
  }
}

export default ScoreBoard;
