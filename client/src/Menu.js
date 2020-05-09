import React, { Component } from "react";
import MenuContent from './MenuContent.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

class Menu extends Component {

  constructor() {
    super();
    this.state = {
      open: false
    }
  }

  toggleMenu = () => {
    this.setState({open: !this.state.open});
  }

  onCloseGame = () => {
    this.setState({open: false});
    this.props.closeGame();
  }

  render() {
    return (
      <div className={"Menu " + (this.state.open ? "menu-open" : "")}>
        <MenuContent onCloseGame={this.props.closeGame} toggleMenu={this.toggleMenu} game={this.props.game}/>
        <button className="menubutton" onClick={this.toggleMenu}>
          <FontAwesomeIcon className="open-icon"
            icon={['fas', 'bars']}
            size="2x"
          />
          <FontAwesomeIcon className="close-icon"
            icon={['fas', 'times']}
            size="2x"
          />
        </button>
      </div>
    );
  }
}

export default Menu;
