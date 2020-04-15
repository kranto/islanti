import React, { Component } from "react";

class Hand extends Component {

  constructor(props){
    super(props)
  }

  componentDidMount() {
  }

  componentDidUpdate() {
    
  }

  onClick = () => {
    if (this.props.onClick) this.props.onClick(); // call parent
  }

  getClasses = () => "Hand " + this.props.classes  + " " + (this.props.selected1 ? "selected1" : "")

  render() {
    return (
      <div id={this.props.id} className={this.getClasses()} style={this.props.style} onClick={this.onClick}>
      </div>
    );
  }
}

export default Hand;
