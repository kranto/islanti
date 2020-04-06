
import React, { Component, useRef } from "react";
import socketIOClient from "socket.io-client";
import './CardTable.css';
import $ from 'jquery';
import cards from './cards.js';
import Hand from './Hand.js';
//import game from "./game.js";
import Card from './Card.js';

class CardTable extends Component {

  constructor() {
    super();
    let endpoint = (window.location.hostname === 'localhost' ? "http://localhost:4000/" : "" );
    this.card = React.createRef()
    this.state = {
      response: false,
      endpoint: endpoint,
      pad: 25,
      cardWidth: 64,
      others: [13,13,13],
      myhands: [5,2,6,1],
      cards: this.createCards(),
      faceUp: false
    };
  }

  componentDidMount() {
    const { endpoint } = this.state;
    const socket = socketIOClient(endpoint);
    socket.on('chat message', data => this.setState({ response: data }));

    cards.init({table:'.CardTable', redJoker: true, blackJoker: true});
    let deck = new cards.Deck({element: $("#deck")}); 
    deck.addCards(cards.all);
    deck.render({immediate:true});
    setTimeout(() => this.card.current.setFaceUp(true), 2000); 
  }

  createOthers() {
    // return this.state.others.map(i => (<div key={"h" + i} className="player-hand"></div>));
    return this.state.others.map((count, index) => (<Hand key={"o" + index} classes="player-hand" cardCount={count} padding={10} spacing={25} cardWidth={64}/>));
  }

  createMyHands() {
    return this.state.myhands.map((count, index) => (<Hand key={"m" + index} classes="open-hand selected draggable-container" cardCount={count} padding={10} spacing={25} cardWidth={64}/>));
  }

  createCards() {
    this.c1 = (<Card x={100} y={200} ref={this.card} name="d8" back="blue" faceUp={false}></Card>);
    return [this.c1]
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
            <div id="opencard_myturn">Sinä aloitat.<br/>Järjestä kortit ja odota, että kaikki ovat valmiita.<br/>Klikkaa sitten yksi kortti pakasta avopakkaan.</div>
            <div id="opencard_others"><span>XXX</span> aloittaa.<br/>Järjestä kortit ja kerro, että olet valmis aloittamaan.</div>
            <div id="pickcard" style={{display: 'none'}}>Klikkaa kortti pakasta tai avopakasta.</div>
            <div id="selectseries" style={{display: 'none'}}>Valitse <span>kolmoset ja suorat</span><div id="errormsg"></div></div>
          </div>
          <div id="controls">
            <button id="openButton" style={{display: 'none'}}>Avaan!</button>
            <button id="confirmOpenButton" style={{display: 'none'}}>Valmis</button>
            <button id="cancelOpenButton" style={{display: 'none'}}>En avaakaan</button>
          </div>
          <div id="openhands">
            {this.createMyHands()}
            <div id="newopen" className="new-open"><div>+</div></div>
          </div>
          {this.state.cards}
        </div>
      </div>
    );
  }
}

export default CardTable;
