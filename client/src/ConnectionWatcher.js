
import React, { Component } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './GameRoom.css';

class ConnectionWatcher extends Component {

  constructor() {
    super();
    this.state = {
    };
  }

  onGameConnectionChange = () => {
    console.log('onGameConnectionChange', this.props.stateManager.gameConnection);
    this.setState({gameConnection: this.props.stateManager.gameConnection});
  }

  componentDidMount() {
    this.onGameConnectionChange();
    this.props.stateManager.subscribeTo('gameConnectionChange', this.onGameConnectionChange);
  }

  componentWillUnmount() {
    this.props.stateManager.unsubscribe('gameConnectionChange', this.onGameConnectionChange);
  }

  render() {
    return (
        <div className={"ConnectionWatcher " + (this.state.gameConnection ? "connected" : "disconnected")}>
          <div className="backdrop"></div> 
          <FontAwesomeIcon className="wifi-icon"
            icon={['fas', 'wifi']}
            size="3x" />
          <FontAwesomeIcon className="slash-icon"
            icon={['fas', 'slash']}
            size="3x" />
        </div>        
    );
  }
}

export default ConnectionWatcher;
