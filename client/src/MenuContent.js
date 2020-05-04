import React, { Component } from "react";

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
          <button className="btn btn-dark" onClick={this.onCloseGame}>Sulje peli</button>
      </div>
    );
  }
}

export default MenuContent;
