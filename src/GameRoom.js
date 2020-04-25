
import React, { Component } from "react";
import './GameRoom.css';
import GameStart from './GameStart.js';
import ScoreBoard from './ScoreBoard.js';
import CardTable from './CardTable.js';

class GameRoom extends Component {

  constructor() {
    super();
    this.state = {
      canStart: false,
    };
  }

  onStateChange = () => {
    let roundState = this.props.stateManager.getState();
    console.log("GameRoom.onStateChange", roundState)
    this.setState({game: roundState.game});
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

  onStartGame = () => {
    this.setState({canStart: true});
  }

  render() {

    console.log("render", this.state.s);
    if (this.state.s === undefined) console.log("Latautuu...");

    return (
        <div className="GameRoom">
          <GameStart data={this.state.game} onStartGame={this.onStartGame} onExitGame={this.props.exitGame}></GameStart>
          {/* <ScoreBoard data={this.state.game} onScoreBoardClosed={this.onScoreBoardClosed}></ScoreBoard> */}
          <CardTable goToGame={this.props.goToGame} canStart={this.state.canStart} stateManager={this.props.stateManager}></CardTable>
        </div>        
    );
  }
}

export default GameRoom;
