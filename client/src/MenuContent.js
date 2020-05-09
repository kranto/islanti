import React, { Component } from "react";
import ScoreBoard from "./ScoreBoard";

class MenuContent extends Component {

  constructor() {
    super();
  }

  onCloseGame = () => {
    console.log('onCloseGame', this);
    this.props.onCloseGame();
  }

  render() {
    return (
      <div className={"MenuContent "}>
          <div></div>
          <ScoreBoard game={this.props.game}></ScoreBoard>
          <button className="btn btn-secondary" onClick={this.props.toggleMenu}>Sulje tulostaulu</button>
          <button className="btn btn-dark" onClick={this.onCloseGame}>Palaa aloitussivulle</button>
      </div>
    );
  }
}

export default MenuContent;
