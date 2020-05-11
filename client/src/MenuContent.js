import React, { Component } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
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
        {this.props.game && (this.props.game.ended || !this.props.game.locked) ? "" :
          <div className="menuTopRow">
            <button className="btn btn-secondary" onClick={this.props.toggleMenu}>
              <FontAwesomeIcon icon={['fas', 'times']} />
            </button>
          </div>
        }
        {this.props.game && this.props.game.locked ? <ScoreBoard game={this.props.game}></ScoreBoard> : ""}
        <button className="btn btn-light menu-action-button" onClick={this.onCloseGame}>Palaa aloitussivulle</button>
      </div>
    );
  }
}

export default MenuContent;
