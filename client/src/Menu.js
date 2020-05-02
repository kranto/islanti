import React, { Component } from "react";
import MenuContent from './MenuContent.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

class Menu extends Component {

  constructor() {
    super();
    this.state = {
      open: true
    }
  }

  toggleMenu = () => {
    this.setState({open: !this.state.open});
  }

  render() {
    return (
      <div className={"Menu " + (this.state.open ? "menu-open" : "")}>
        <MenuContent/>
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
