
import React, { Component } from "react";
import './CardTable.css';
import Hand from './Hand.js';
import game from './game';

class CardTable extends Component {

  constructor() {
    super();
    this.state = {
      s: { can: {}, players: [], myhands: {closed: []} }
    };
  }

  componentDidMount() {
    this.props.stateManager.subscribeTo('stateChange', (params) => {
      console.log('CardTable.listenToEvent', params);
      this.setState({...this.state, s : this.props.stateManager.getState()})
    });

    game.init(this.props.stateManager);
  }

  componentDidUpdate() {
    console.log('componentDidUpdate');
    game.stateChange({action: 'fullState', state: {...this.state.s, opening: this.state.opening}});    
  }

  createPlayers() {
    let state = this.state.s;
    return state.players.map((p, index) => {
      return (
      <div id={"player" + index} key={"o" + index} 
        className={"other-player turn-indicator" + (p.inTurn ? " in-turn" : "")}  
        style={{display: (p.closed ? 'initial' : 'none')}}>
        <div className="player-name">{p.name}</div>
        <Hand classes="player-hand closed-hand"/>
      </div>
    );});
  }

  createMySections() {
    let sections = this.state.s.myhands.closed;
    return (
      <div>
        {[...Array(20).keys()].map(i => 
        <Hand key={i} id={"section" + i} 
          classes="hand-section section" 
          style={{display: i < sections.length ? 'block' : 'none'}}
          selected = {this.state.selected && this.state.selected.length > i ? this.state.selected[i] : false}
          onClick={() => {console.log('hand ' + i + ' clicked'); let sel = [...this.state.selected]; sel[i] = !sel[i]; this.setState({selected: sel});
        }}>
        </Hand>)}
      </div>
    );
  }

  startOpening() {
    this.setState({opening: true, selected: this.state.s.myhands.closed.map(() => false)});
  }

  cancelOpening() {
    this.setState({opening: false});
  }

  createInstructions() {
    let state = this.state.s;
    if (state.phase === 1) {
      if (state.myTurn) {
        return <div>Sinun vuorosi jakaa.</div>
      } else {
        return <div><span>{state.players[state.playerInTurn].name}</span> jakaa kortit</div>
      }
    } else if (state.phase === 2) {
      if (state.myTurn) {
        return <div>Sinä aloitat. Kun kaikki ovat järjestäneet korttinsa ja ovat valmiita, voit avata yhden kortin pakasta.</div>
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
        return <div>{state.players[state.buying].name} haluaa ostaa.</div>
      } else {
        return <div>{state.players[state.buying].name} haluaa ostaa. {state.players[state.playerInTurn].name} miettii.</div>
      }
    } else if (state.phase === 4) {
      if (state.myTurn) {
        if (state.can.open && !this.state.opening) {
          return <div>Pelaa vuoro ja laita lopuksi kortti avopakkaan</div>
        } else if (this.state.opening) {
          return <div>Valitse sarjat</div>
        }
      } else {
        return <div><span>{state.players[state.playerInTurn].name}</span> pelaa vuoroaan.</div>
      }
    }
    return "";
    // <div id="selectseries" style={{display: 'none'}}>Valitse <span>kolmoset ja suorat</span><div id="errormsg"></div></div>

  }

  createControls() {
    let state = this.state.s;
    if (state.can.deal) {
      return <button onClick={() => this.props.stateManager.sendAction('deal')}>Jaa kortit</button>
    } else if (state.can.show) {
      return <button onClick={() => this.props.stateManager.sendAction('showCard')}>Avaa kortti</button>
    } else if (state.can.sell) {
      return (
        <div> 
          <button onClick={() => this.props.stateManager.sendAction('sell')}>Myyn</button>
          <button onClick={() => this.props.stateManager.sendAction('dontsell')}>En myy</button>
        </div>);
    } else if (state.can.open && !this.state.opening) {
      return <button onClick={() => this.startOpening()}>Avaan</button>
    } else if (this.state.opening) {
      return <button onClick={() => this.cancelOpening()}>En avaakaan</button>
    }
    return "";
  }

  render() {

    return (
      <div className={"CardTable " + (this.state.opening ? "selecting" : "")}>
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
          </div>
          <div id="controls">
            {this.createControls()}
          </div>
          <div id="my-closed-hand-sections" className={"turn-indicator " + (this.state.s.myhands && this.state.s.myhands.inTurn ? "in-turn" : "")}>
            <div id="section-template" className="section" style={{display: 'none'}}></div>
            {this.createMySections()}
            <div id="newsection" className="new-section"><div>+</div></div>
          </div>
        </div>
      </div>
    );
  }
}

export default CardTable;
