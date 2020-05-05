
import React, { Component } from "react";
import './CardTable.css';
import Hand from './Hand.js';
import game from './game';

class CardTable extends Component {

  constructor() {
    super();
    this.state = {
      selected: [],
      selectionOk: false,
      opening: false
    };
    this.gameInitialized = false;
  }

  onStateChange = () => {
    this.setState({...this.state, s : this.props.stateManager.state.roundState});
  }

  componentDidMount() {
    this.props.stateManager.subscribeTo('roundStateChange', this.onStateChange);
  }

  componentWillUnmount() {
    this.props.stateManager.unsubscribe('roundStateChange', this.onStateChange);
    if (this.gameInitialized) {
      game.unload();
    }
  }

  componentDidUpdate() {
    if (this.state.s && this.state.s.phase > 0 && this.state.s.phase < 6 && this.props.canStart) {
      if (!this.gameInitialized) {
        game.init(this.props.stateManager);      
        this.gameInitialized = true;
      }
      game.stateChange({action: 'roundState', state: {...this.state.s, opening: this.state.opening}});
    }
  }

  createPlayers() {
    let state = this.state.s;
    return state.players.map((p, index) => {
      return (
      <div id={"player" + index} key={"o" + index} 
        className={"other-player turn-indicator" + (p.inTurn ? " in-turn" : "")}>
        <div className="player-name">{p.name}</div>
        <div className="player-hands">
          <Hand classes="player-hand closed-hand" score={p.score}/>
          {p.open.map((h, i) => <Hand key={"p" + index + "o" + i} id={"p" + index + "o" + i} classes="player-hand open-hand"></Hand>)}
        </div>
      </div>
    );});
  }

  createMySections() {
    if (!this.state.s.myhands) return "";
    let sections = this.state.s.myhands.closed;
    return (
      <div>
        {this.state.s.myhands.closed.map((section, i) => 
        <Hand key={i} id={"section" + i} 
          classes="hand-section section" 
          error={this.state.opening && i < sections.length && !this.state.s.myhands.validity[i].valid}
          selected = {this.state.selected && this.state.selected.length > i ? this.state.selected[i] : false}
          onClick={() => this.onSectionClicked(i)}
          score={this.state.s.myhands.score}>
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
    let selectionOk = 
      (!this.props.stateManager.state.round.isFreestyle 
        && selection.sets === this.props.stateManager.state.round.expectedSets
        && selection.straights === this.props.stateManager.state.round.expectedStraights) ||
      (this.props.stateManager.state.round.isFreestyle
        && state.myhands.closed.flat().length - selection.cards <= 1);

    if (selectionOk) {
      this.props.stateManager.validateSelection(sel.map((x, i) => x ? i : -1).filter(i => i >= 0), result => {
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
        return <div><span>{state.players[state.playerInTurn].name}</span> nostaa{state.can.buy ? ". Voit yrittää ostaa kortin klikkaamalla avopakkaa.": ""} </div>
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
          return <div>Valitse {this.props.stateManager.state.round.roundName}</div>
        } else {
          return <div>Pelaa vuoro ja laita lopuksi kortti avopakkaan</div>
        }
      } else {
        return <div><span>{state.players[state.playerInTurn].name}</span> pelaa vuoroaan.</div>
      }
    } else if (state.phase === 5) {
      if (state.winner < 0) {
        return <div className="winner">Sinä voitit tämän kierroksen!</div>
      } else {
        return <div className="winner"><span>{state.players[state.winner].name}</span> voitti tämän kierroksen</div>
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
        <button onClick={() => this.confirmOpening()} disabled={!this.state.selectionOk}>Avaa valitut</button>
        <button onClick={() => this.cancelOpening()}>En avaakaan</button>
      </div>);
    } else if (state.can.startNextRound) {
      return <button onClick={() => this.props.onNextRound()}>Aloita seuraava kierros</button>
    } else if (state.can.endGame) {
      return <button onClick={() => this.props.onEndGame()}>Sulje peli</button>
    }
    return "";
  }

  render() {

    if (!this.props.canStart || !this.state.s || this.state.s.phase === 0 || this.state.s.phase === 6) return (
      <div className="CardTable"></div>
    );

    let imGuest = this.state.s.myhands === null || this.state.s.myhands.open === undefined;

    return (
      <div className={"CardTable " 
      + (this.state.opening ? "selecting" : "") 
      + (this.state.s.myhands && this.state.s.myhands.inTurn ? " in-turn" : "")
      + (this.state.s.phase >= 5 ? " round-ended" : "")}>
        <div id="otherplayers">
            {this.createPlayers()}
        </div>
        <div id="gamearea" className={"turn-indicator " + (this.state.s.myhands && this.state.s.myhands.inTurn ? "in-turn" : "")}>
          <div id="roundinfo">Kierros {this.props.stateManager.state.round.roundNumber}/8 &ndash; {this.props.stateManager.state.round.roundName}</div>
          <div id="instructions">
                {this.createInstructions()}
          </div>
          <div id="deckrow">
            <div id="deckandpile">
              <div id="deck"></div>
              <div id="pile"></div>
            </div>
            {imGuest ? "" : (
            <div id="deckrowcolumn2">
              {this.state.s.myhands.open.map((h, i) => <Hand key={"m" + i} id={"myopen" + i} classes="player-hand open-hand"></Hand>)}
              <div id="controls">
                {this.createControls()}
              </div>
            </div>)}
          </div>
          {imGuest ? "" : (
          <div id="my-closed-hand-sections" className={"turn-indicator " + (this.state.s.myhands && this.state.s.myhands.inTurn ? "in-turn" : "")}>
            {this.createMySections()}
            <div id="newsection" className="new-section" style={{visibility: (this.state.s.phase >= 2 && this.state.s.phase <= 4) ? "visible" : "hidden"}}><div>+</div></div>
          </div>)}
        </div>
      </div>
    );
  }
}

export default CardTable;
