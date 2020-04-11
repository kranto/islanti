import React, { Component } from "react";

class Hand extends Component {

  constructor(props){
    super(props)
  }

  componentDidMount() {
  }

  componentDidUpdate() {
    
  }

  render() {
    return (
      <div id={this.props.id} className={"Hand " + this.props.classes}>
      </div>
    );
  }
}

export default Hand;
