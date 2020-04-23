
import React, { Component } from "react";
import './GameRoom.css';
import ScoreBoard from './ScoreBoard.js';
import CardTable from './CardTable.js';

class GameRoom extends Component {

  constructor() {
    super();
    this.state = {
      game: {rounds: [], players: [], scores: []},
      canStart: false,
    };
  }

  onStateChange = () => {
    console.log("GameRoom.onStateChange", this.props.stateManager.getState())
    let roundState = this.props.stateManager.getState();
    this.setState({game: {rounds: roundState.rounds, players: roundState.players.map(p => p.name), scores: []}});
  }

  componentDidMount() {
    this.props.stateManager.subscribeTo('stateChange', this.onStateChange);
  }

  componentWillUnmount() {
    this.props.stateManager.unsubscribe('stateChange', this.onStateChange);
  }

  componentDidUpdate() {
  }

  onScoreBoardClosed = () => {
    this.setState({canStart: true});
  }


  render() {

    console.log("render", this.state.s);
    if (this.state.s === undefined) console.log("Latautuu...");

    return (
        <div className="GameRoom">
          <ScoreBoard data={this.state.game} onScoreBoardClosed={this.onScoreBoardClosed}></ScoreBoard>
          <CardTable goToGame={this.props.goToGame} canStart={this.state.canStart} stateManager={this.props.stateManager}></CardTable>
        </div>        
    );
  }
}

export default GameRoom;
