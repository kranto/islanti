
import React, { Component } from "react";
import './CardTable.css';
import Hand from './Hand.js';
import game from './game';

class CardTable extends Component {

  constructor() {
    super();
    this.state = {
      s: { can: {}, players: [], myhands: {closed: [], open: []} },
      selected: [],
      selectionOk: false,
      opening: false
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
        <Hand classes="player-hand closed-hand" visible={true}/>
        {p.open.map((h, i) => <Hand id={"p" + index + "o" + i} classes="open-hand" visible={true}></Hand>)}
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
          visible={i < sections.length}
          error={this.state.opening && i < sections.length && !this.state.s.myhands.validity[i].valid}
          selected = {this.state.selected && this.state.selected.length > i ? this.state.selected[i] : false}
          onClick={() => this.onSectionClicked(i)}>
        </Hand>)}
      </div>
    );
  }

  validateSelection = (sel, callback) => {
    let state = this.state.s; 
    let selection = sel.reduce((acc, selected, i) => (
      !selected ? acc :
      {...acc, 
        sets: acc.sets + (state.myhands.validity[i].type === 'set' ? 1 : 0),
        straights: acc.straights + (state.myhands.validity[i].type === 'straight' ? 1 : 0),
        cards: acc.cards + state.myhands.closed[i].length
      }), {sets: 0, straights: 0, cards: 0});
    console.log(selection);
    let selectionOk = 
      (!state.round.isFreestyle 
        && selection.sets === state.round.expectedSets
        && selection.straights === state.round.expectedStraights) ||
      (state.round.isFreestyle
        && state.myhands.closed.flat().length - selection.cards <= 1);

    if (selectionOk) {
      this.props.stateManager.validateSelection(sel.map((x, i) => x ? i : -1).filter(i => i >= 0), result => {
        console.log(result);
        callback (result.valid, result.msg);
      });
    } else {
      callback(false);
    }
  }

  onSectionClicked = (index) => {
    let state = this.state.s; 
    if (!state.myhands.validity[index].valid) return;
    let sel = [...this.state.selected];
    sel[index] = !sel[index];
    console.log(index, state.myhands.validity, this.state.selected);

    this.validateSelection(sel, (ok, msg) => this.setState({selected: sel, selectionOk: ok, msg: msg}));
  }

  startOpening() {
    this.setState({opening: true, selected: this.state.s.myhands.closed.map(() => false), selectionOk: false});
  }

  cancelOpening() {
    this.setState({opening: false});
  }

  confirmOpening() {
    this.props.stateManager.sendAction('open', {selectedIndices: this.state.selected.map((x, i) => x ? i : -1).filter(i => i >= 0)});
    this.setState({opening: false, selectionOk: false});
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
          return <div>Valitse {this.state.s.round.roundName}</div>
        } else {
          return <div>Pelaa vuoro ja laita lopuksi kortti avopakkaan</div>
        }
      } else {
        return <div><span>{state.players[state.playerInTurn].name}</span> pelaa vuoroaan.</div>
      }
    } else if (state.phase === 5) {
      if (state.winner < 0) {
        return <div>Sinä voitit!!</div>
      } else {
        return <div><span>{state.players[state.winner].name}</span> voitti</div>
      }
    }
    return "";

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
      return (<div>
        <button onClick={() => this.confirmOpening()} disabled={this.state.selectionOk ? "" : "true"}>Avaa valitut</button>
        <button onClick={() => this.cancelOpening()}>En avaakaan</button>
      </div>);
    }
    return "";
  }

  render() {

    return (
      <div className={"CardTable " + (this.state.opening ? "selecting" : "") + (this.state.s.myhands.inTurn ? " in-turn" : "")}>
        <div id="otherplayers">
            {this.createPlayers()}
        </div>
        <div id="gamearea">
          <div id="deckandpile">
            <div id="deck"></div>
            <div id="pile"></div>
          </div>
          {this.state.s.myhands.open.map((h, i) => <Hand id={"myopen" + i} classes="open-hand" visible={true}></Hand>)}
          <div id="instructions">
            {this.createInstructions()}
          </div>
          <div id="controls">
            {this.createControls()}
          </div>
          <div id="my-closed-hand-sections" className={"turn-indicator " + (this.state.s.myhands && this.state.s.myhands.inTurn ? "in-turn" : "")}>
            <div id="section-template" className="section" style={{display: 'none'}}></div>
            {this.createMySections()}
            <div id="newsection" className="new-section" style={{visibility: (this.state.s.phase >= 2 && this.state.s.phase <= 4) ? "visible" : "hidden"}}><div>+</div></div>
          </div>
        </div>
      </div>
    );
  }
}

export default CardTable;
