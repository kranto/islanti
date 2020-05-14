import React, { Component } from "react";

class Hand extends Component {

  componentDidMount() {
  }

  componentDidUpdate() {
    
  }

  onClick = () => {
    if (this.props.onClick) this.props.onClick(); // call parent
  }

  getClasses = () => "Hand " + this.props.classes  + (this.props.selected ? " selected" : "") + (this.props.error ? " error" : "");

  render() {
    return (
      <div id={this.props.id} className={this.getClasses()} style={this.props.style} onClick={this.onClick}>
        {this.props.score !== undefined ? <div className="hand-score">{this.props.score}</div> : ""}
        {this.props.cardCount !== undefined ? <div className="hand-length">{this.props.cardCount}</div> : ""} 
      </div>
    );
  }
}

export default Hand;
