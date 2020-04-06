import React, { Component } from "react";

class Card extends Component {

  constructor(props){
    super(props);
    this.div = React.createRef();
    this.state = {
      faceUp: props.faceUp
    }
  }

  componentDidMount() {
    console.log(this.div.current.offsetWidth, this.div.current.getBoundingClientRect(), this.div.current.getClientRects());
  }

  componentDidUpdate() {
    
  }

  setFaceUp(faceUp) {
    this.setState({... this.state, faceUp: faceUp});
  }

  getClasses() {
    return "playingcard " + (this.state.faceUp ? "faceup" : "facedown") + (this.props.classes ? " " + this.props.classes : "");
  }

  getFaceupImage() {
    return this.props.name ? (<img src={"svg/" + this.props.name + ".svg"} alt="" draggable="false" className="faceup-img"/>) : "";
  }

  render() {
    return (
      <div ref={this.div} className={"playingcard " + this.getClasses()} style={{left: this.props.x, top: this.props.y}}>
        {this.getFaceupImage()}
        <img src={"svg/cardback_" + this.props.back + ".svg"} alt="card face down" draggable="false" className="facedown-img"/>
      </div>
    );
  }
}

export default Card;
