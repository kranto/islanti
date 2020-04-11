
import React, { Component } from "react";
import socketIOClient from "socket.io-client";
import './CardTable.css';
import Hand from './Hand.js';

class CardTable extends Component {

  constructor() {
    super();
    let endpoint = (window.location.hostname === 'localhost' ? "http://localhost:4000" : "" );
    this.state = {
      endpoint: endpoint,
      others: [1,2,3,4,5,6,7,8]
    };
  }

  componentDidMount() {
    this.props.stateManager.subscribeTo('stateChange', (params) => {
      console.log('CardTable.listenToEvent', params);
      this.setState({others: this.props.stateManager.getState().players.map(p => p.closed.length)})
    })
  }

  createOthers() {
    return this.state.others.map((count, index) => 
    (<Hand id={"hand" + (index+1)} key={"o" + index} classes="player-hand"/>));
  }

  render() {

    return (
      <div className="CardTable selecting">
        <div id="otherplayers">
            {this.createOthers()}
        </div>
        <div id="gamearea">
          <div id="deckandpile">
            <div id="deck"></div>
            <div id="pile"></div>
          </div>
          <div id="instructions">
            <div id="showcard_myturn">Sinä aloitat.<br/>Järjestä kortit ja odota, että kaikki ovat valmiita.<br/>Klikkaa sitten yksi kortti pakasta avopakkaan.</div>
            <div id="showcard_others"><span>XXX</span> aloittaa.<br/>Järjestä kortit ja kerro, että olet valmis aloittamaan.</div>
            <div id="pickcard" style={{display: 'none'}}>Klikkaa kortti pakasta tai avopakasta.</div>
            <div id="selectseries" style={{display: 'none'}}>Valitse <span>kolmoset ja suorat</span><div id="errormsg"></div></div>
          </div>
          <div id="controls">
            <button id="openButton" style={{display: 'none'}}>Avaan!</button>
            <button id="confirmOpenButton" style={{display: 'none'}}>Valmis</button>
            <button id="cancelOpenButton" style={{display: 'none'}}>En avaakaan</button>
          </div>
          <div id="my-closed-hand-sections">
            <div id="section-template" className="section draggable-container" style={{display: 'none'}}></div>
            <div id="newsection" className="new-section"><div>+</div></div>
          </div>
        </div>
      </div>
    );
  }
}

export default CardTable;
