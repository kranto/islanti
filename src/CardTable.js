
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
        className={"other-player turn-indicator" + (p.inTurn ? " in-turn" : "")}  
        style={{display: (p.closed ? 'initial' : 'none')}}>
        <div className="player-name">{p.name}</div>
        <Hand classes="player-hand closed-hand"/>
      </div>
    );});
  }

  createInstructions() {
    let state = this.state.s;
    if (state.phase === 1) {
      if (state.myTurn) {
        return <div>Sinun vuorosi jakaa. <button onClick={() => this.props.stateManager.sendAction('deal')}>Jaa kortit</button></div>
      } else {
        return <div><span>{state.players[state.playerInTurn].name}</span> jakaa kortit</div>
      }
    } else if (state.phase === 2) {
      if (state.myTurn) {
        return <div>Sinä aloitat. Kun kaikki ovat järjestäneet korttinsa ja ovat valmiita, voit avata yhden kortin pakasta.<button onClick={() => this.props.stateManager.sendAction('showCard')}>Avaa kortti</button></div>
      } else {
        return <div><span>{state.players[state.playerInTurn].name}</span> aloittaa. Järjestä kortit ja ole valmis, kun peli alkaa.</div>
      }
    } else if (state.phase === 3 || state.phase === 3.2) {
      if (state.myTurn) {
        return <div>Nosta kortti pakasta tai avopakasta klikkaamalla</div>
      } else {
        return <div><span>{state.players[state.playerInTurn].name}</span> nostaa. {state.can.buy ? "Voit yrittää ostaa kortin klikkaamalla avopakkaa.": ""} </div>
      }
    } else if (state.phase === 3.1) {
      if (state.buying < 0) {
        return <div>Haluat ostaa. {state.players[state.playerInTurn].name} miettii.</div>
      } else if (state.can.sell) {
        return <div>{state.players[state.buying].name} haluaa ostaa. 
          <button onClick={() => this.props.stateManager.sendAction('sell')}>Myyn</button>
          <button onClick={() => this.props.stateManager.sendAction('dontsell')}>En myy</button>
          </div>
      } else {
        return <div>{state.players[state.buying].name} haluaa ostaa. {state.players[state.playerInTurn].name} miettii.</div>
      }
    } else if (state.phase === 4) {
      if (state.myTurn) {
        return <div>
            Pelaa vuoro ja laita lopuksi kortti avopakkaan
            {state.can.open ? <div>avaa</div> :""}
          </div>
      } else {
        return <div><span>{state.players[state.playerInTurn].name}</span> pelaa vuoroaan.</div>
      }
    }
    return "";
    // <div id="selectseries" style={{display: 'none'}}>Valitse <span>kolmoset ja suorat</span><div id="errormsg"></div></div>

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
            {this.createInstructions()}
            <div id="selectseries" style={{display: 'none'}}>Valitse <span>kolmoset ja suorat</span><div id="errormsg"></div></div>
          </div>
          <div id="controls">
            <button id="openButton" style={{display: 'none'}}>Avaan!</button>
            <button id="confirmOpenButton" style={{display: 'none'}}>Valmis</button>
            <button id="cancelOpenButton" style={{display: 'none'}}>En avaakaan</button>
          </div>
          <div id="my-closed-hand-sections" className={"turn-indicator " + (this.state.s.myhands && this.state.s.myhands.inTurn ? "in-turn" : "")}>
            <div id="section-template" className="section draggable-container" style={{display: 'none'}}></div>
            <div id="newsection" className="new-section"><div>+</div></div>
          </div>
        </div>
      </div>
    );
  }
}

export default CardTable;
