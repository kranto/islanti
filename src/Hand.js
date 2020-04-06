import React, { Component } from "react";

class Hand extends Component {

  constructor(props){
    super(props)
    this.div = React.createRef()
  }

  calculateWidth() {
    let w = this.props.cardCount * this.props.spacing + this.props.cardWidth + this.props.padding + "px";
    return w;
  }

  componentDidMount() {
    console.log(this.div.current.offsetWidth, this.div.current.getBoundingClientRect(), this.div.current.getClientRects());
  }

  componentDidUpdate() {
    
  }

  render() {
    return (
      <div id={this.props.id} ref={this.div} className={"Hand " + this.props.classes} style={{width: this.calculateWidth()}}>
      </div>
    );
  }
}

export default Hand;
