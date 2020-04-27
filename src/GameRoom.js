
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
    this.props.stateManager.sendGameAction('startGame');
  }

  onNextRound = () => {
    this.props.stateManager.sendGameAction('nextRound');
  }

  onEndGame = () => {
    this.props.stateManager.sendGameAction('endGame');
  }

  render() {
    return (
        <div className="GameRoom">
          <GameStart game={this.state.game} onStartGame={this.onStartGame} onExitGame={this.props.exitGame}></GameStart>
          {/* <ScoreBoard game={this.state.game} onScoreBoardClosed={this.onScoreBoardClosed}></ScoreBoard> */}
          <CardTable goToGame={this.props.goToGame} onNextRound={this.onNextRound} onEndGame={this.onEndGame} canStart={this.state.game && this.state.game.locked} stateManager={this.props.stateManager}></CardTable>
        </div>        
    );
  }
}

export default GameRoom;
