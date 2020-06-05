
import React, { Component } from "react";
import './GameRoom.css';
import GameStart from './GameStart';
import CardTable from './CardTable';
import Menu from './Menu';
import ConnectionWatcher from './ConnectionWatcher';

class GameRoom extends Component {

  constructor() {
    super();
    this.state = {
      canStart: false
    };
  }

  onStateChange = () => {
    this.setState({game: this.props.stateManager.state.gameState});
  }

  componentDidMount() {
    this.props.stateManager.subscribeTo('gameStateChange', this.onStateChange);
  }

  componentWillUnmount() {
    this.props.stateManager.unsubscribe('gameStateChange', this.onStateChange);
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
    this.props.closeGame();
  }

  loadAllCardImages = () => {
    let cardnames = ["s", "h", "d", "c"].map(s => [1,2,3,4,5,6,7,8,9,10,11,12,13].map(r => s + r)).flat()
    .concat(["r0", "b0", "cardback_blue", "cardback_red"]);
    return (<div>
      {cardnames.map((cn, i) => <img key={i} src={"svg/" + cn + ".svg"} style={{width: "10px", heigth: "10px"}}></img>)}
    </div>)
    return "";
  }

  render() {
    return (
        <div className="GameRoom">
          <GameStart game={this.state.game} onStartGame={this.onStartGame} onDiscardGame={this.props.discardGame} onExitGame={this.props.exitGame}></GameStart>
          <CardTable 
            onNextRound={this.onNextRound} 
            onEndGame={this.onEndGame} 
            canStart={this.state.game && this.state.game.locked} 
            stateManager={this.props.stateManager}>
          </CardTable>
          <Menu closeGame={this.props.closeGame} game={this.state.game}/>
          <ConnectionWatcher stateManager={this.props.stateManager} />
          {this.loadAllCardImages()}
        </div>        
    );
  }
}

export default GameRoom;
