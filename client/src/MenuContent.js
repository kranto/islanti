import React, { Component } from "react";

class MenuContent extends Component {

  constructor() {
    super();
  }

  render() {
    return (
      <div className={"MenuContent "}>
          <div></div>
          <button className="btn btn-dark">Palaa pelin valintaan</button>
          <button className="btn btn-warning">Poistu pelistä lopullisesti</button>
      </div>
    );
  }
}

export default MenuContent;
