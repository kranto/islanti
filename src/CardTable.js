
import React, { Component } from "react";
import socketIOClient from "socket.io-client";
import './CardTable.css';
import Hand from './Hand.js';
import game from "./game.js";

class CardTable extends Component {

  constructor() {
    super();
    let endpoint = (window.location.hostname === 'localhost' ? "http://localhost:4000" : "" );
    this.state = {
      endpoint: endpoint,
      pad: 25,
      cardWidth: 64,
      others: [13,13,13]
    };
  }

  componentDidMount() {
    this.initSocket();
  }

  initSocket() {
    console.log('initSocket', this.socket);
    if (this.socket) return;
    console.log('initSocket contd');

    const { endpoint } = this.state;
    this.socket = socketIOClient(endpoint + "/game/dev");
    game.init(this.socket);

    this.socket.on('stateChange', args => {
      game.stateChange(args);
    });

    this.socket.on('connect', () => {
      console.log('connected');
      this.authenticate();
    });

    this.socket.on('reconnect', () => {
      console.log('reconnected');
    });

    this.socket.on('reconnect_attempt', (i) => {
      console.log('attempting to reconnect', i);
    });

    this.socket.on('disconnect', () => {
      console.log('disconnected');
    });

    this.socket.on('authenticated', () => this.getFullState());
  }

  authenticate() {
    let hash = window.location.hash;
    let id = hash && hash.length > 2 ? hash[2] : "0";
    this.socket.emit('authenticate', id);
  }

  getFullState() {
    this.socket.emit('state');
  }

  createOthers() {
    return this.state.others.map((count, index) => 
    (<Hand id={"hand" + (index+1)} key={"o" + index} classes="player-hand"
    // cards={<><Card name="d1" back="blue" left="10px" top="0px"></Card>
    // <Card name="d2" back="red" left={null} top={null}></Card> 
    // <Card name="d3" faceUp={true} back="red" left="50px" top="0px"></Card></>} 
    cardCount={count} padding={10} spacing={25} cardWidth={64} style={{position: "relative"}}/>));
  }

  createMyHands() {
    return this.state.myhands.map((count, index) => 
    (<Hand key={"m" + index} classes="section selected draggable-container" 
    cardCount={count} padding={10} spacing={25} cardWidth={64}/>));
  }

  simulateOthers() {
    game.simulateOthers();
  }

  deal(myTurn) {
    this.socket.emit('action', {action: 'deal'});
    // game.deal(myTurn);
  }

  showCard() {
    this.socket.emit('action', {action: 'showCard'});
  }

  takeTurn() {
    game.takeTurn();
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
