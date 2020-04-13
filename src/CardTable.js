
import React, { Component } from "react";
import './CardTable.css';
import Hand from './Hand.js';

class CardTable extends Component {

  constructor() {
    super();
    this.state = {
      s: { players: [] }
    };
  }

  componentDidMount() {
    this.props.stateManager.subscribeTo('stateChange', (params) => {
      console.log('CardTable.listenToEvent', params);
      this.setState({...this.state, s : this.props.stateManager.getState()})
    })
  }

  createPlayers() {
    let state = this.state.s;
    return [...Array(7).keys()].map((player, index) => {
      let p = state.players.length > index ? state.players[index] : {};
      return (
      <div id={"player" + index} key={"o" + index} 
        className={"other-player " + (state.playerInTurn == index ? "in-turn" : "")}  
        style={{display: (p.closed ? 'initial' : 'none')}}>
        <div className="player-name">{p.name}</div>
        <Hand classes="player-hand closed-hand"/>
      </div>
    );});
  }

  render() {

    return (
      <div className="CardTable selecting">
        <div id="otherplayers">
            {this.createPlayers()}
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
