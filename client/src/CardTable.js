
import React, { Component } from "react";
import './CardTable.css';
import Hand from './Hand.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
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
    this.setState({ ...this.state, s: this.props.stateManager.state.roundState, c: this.props.stateManager.state.connectionState });
  }

  componentDidMount() {
    this.props.stateManager.subscribeTo('roundStateChange', this.onStateChange);
    this.props.stateManager.subscribeTo('connectionStateChange', this.onStateChange);
  }

  componentWillUnmount() {
    this.props.stateManager.unsubscribe('roundStateChange', this.onStateChange);
    this.props.stateManager.unsubscribe('connectionStateChange', this.onStateChange);
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
      game.stateChange({ action: 'roundState', state: { ...this.state.s, opening: this.state.opening } });
    }
  }

  createPlayers() {
    let state = this.state.s;
    return state.players.map((p, index) => {
      let connectionOk = this.state.c && this.state.c.players[index];
      return (
        <div id={"player" + index} key={"o" + index}
          className={"other-player turn-indicator" 
          + (p.inTurn ? " in-turn" : "")
          + (connectionOk ? " connected" : " disconnected")}>
          <div className="player-name">{p.name}</div>
          <div className="player-hands">
            <Hand classes="player-hand closed-hand" score={state.phase < 5 ? undefined : p.score} cardCount={state.phase > 1 && state.phase < 5 ? p.closed.length : undefined} /><div className="spacer"></div>
            {p.open.map((h, i) => <Hand key={"p" + index + "o" + i} id={"p" + index + "o" + i} classes="player-hand open-hand"></Hand>)}
          </div>
          {connectionOk ? "" : <div className="player-connection-indicator"><FontAwesomeIcon icon={['fas', 'heart-broken']} /></div>}
        </div>
      );
    });
  }

  createMySections() {
    if (!this.state.s.ownInfo) return "";
    let sections = this.state.s.ownInfo.closed;
    return (
      <>
        {this.state.s.ownInfo.closed.map((section, i) =>
          <Hand key={i} id={"section" + i}
            classes="hand-section section"
            error={this.state.opening && i < sections.length && !this.state.s.ownInfo.validity[i].valid}
            selected={this.state.selected && this.state.selected.length > i ? this.state.selected[i] : false}
            onClick={() => this.onSectionClicked(i)}
            score={this.state.s.ownInfo.score}>
          </Hand>)}
      </>
    );
  }

  validateSelection = (sel, callback) => {
    let state = this.state.s;
    let selection = sel.reduce((acc, selected, i) => (
      !selected ? acc :
        {
          ...acc,
          sets: acc.sets + (state.ownInfo.validity[i].type === 'set' ? 1 : 0),
          straights: acc.straights + (state.ownInfo.validity[i].type === 'straight' ? 1 : 0),
          cards: acc.cards + state.ownInfo.closed[i].length
        }), { sets: 0, straights: 0, cards: 0 });
    let selectionOk =
      (!this.props.stateManager.state.round.isFreestyle
        && selection.sets === this.props.stateManager.state.round.expectedSets
        && selection.straights === this.props.stateManager.state.round.expectedStraights) ||
      (this.props.stateManager.state.round.isFreestyle
        && state.ownInfo.closed.flat().length - selection.cards <= 1);

    if (selectionOk) {
      this.props.stateManager.validateSelection(sel.map((x, i) => x ? i : -1).filter(i => i >= 0), result => {
        callback(result.valid, result.msg);
      });
    } else {
      callback(false);
    }
  }

  onSectionClicked = (index) => {
    let state = this.state.s;
    if (!state.ownInfo.validity[index].valid) return;
    let sel = [...this.state.selected];
    sel[index] = !sel[index];

    this.validateSelection(sel, (ok, msg) => this.setState({ selected: sel, selectionOk: ok, msg: msg }));
  }

  startOpening = () => {
    this.setState({ opening: true, selected: this.state.s.ownInfo.closed.map(() => false), selectionOk: false });
  }

  cancelOpening = () => {
    this.setState({ opening: false });
  }

  confirmOpening = () => {
    this.props.stateManager.sendAction('open', { selectedIndices: this.state.selected.map((x, i) => x ? i : -1).filter(i => i >= 0) });
    this.setState({ opening: false, selectionOk: false });
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
        return <div>Sinä aloitat. Kun kaikki ovat valmiita, avaa kortti pakasta.</div>
      } else {
        return <div><span>{state.players[state.playerInTurn].name}</span> aloittaa. Järjestä kortit ja ole valmis, kun peli alkaa.</div>
      }
    } else if (state.phase === 3 || state.phase === 3.2) {
      if (state.myTurn) {
        return <div>Nosta kortti pakasta tai avopakasta vetämällä</div>
      } else {
        return <div><span>{state.players[state.playerInTurn].name}</span> nostaa{state.can.buy ? ". Voit yrittää ostaa." : ""} </div>
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

  actionButton = (type, text, action) => {
    return <button className={"shadow-none btn btn-" + type} onClick={() => this.props.stateManager.sendAction(action)}>{text}</button>
  }

  controlButton = (type, text, onClick, disabled) => {
    return <button className={"shadow-none btn btn-" + type} onClick={onClick} disabled={disabled ? disabled : ""}>{text}</button>
  }

  dummyButton = () => <button style={{visibility: "hidden"}}></button>

  createControls() {
    let state = this.state.s;
    if (state.can.sell) {
      return (
        <>
          {this.actionButton('light', 'Myyn', 'sell')}
          {this.actionButton('dark', 'En myy', 'dontsell')}
        </>);
    } else if (state.can.startNextRound) {
      return <>{this.controlButton('light', 'Aloita seuraava kierros', this.props.onNextRound)}</>
    } else if (state.can.endGame) {
      return <>{this.controlButton('light', 'Sulje peli', this.props.onEndGame)}</>
    }
    return "";
  }

  createControls2() {
    let state = this.state.s;
    if (state.can.deal) {
      return <>{this.actionButton('light', 'Jaa kortit', 'deal')}{this.dummyButton()}</>
    } else if (state.can.show) {
      return <>{this.actionButton('light', 'Avaa kortti', 'showCard')}</>
    } else if (state.can.open && !this.state.opening) {
      return <>{this.controlButton('light', 'Avaan', this.startOpening)}{this.dummyButton()}</>
    } else if (this.state.opening) {
      return (<>
        {this.controlButton('light', 'Avaa valitut', this.confirmOpening, !this.state.selectionOk)}
        {this.controlButton('dark', 'En avaakaan', this.cancelOpening)}
      </>);
    }
    return "";
  }

  render() {

    if (!this.props.canStart || !this.state.s || this.state.s.phase === 0 || this.state.s.phase === 6) return (
      <div className="CardTable"></div>
    );

    let imGuest = this.state.s.imGuest;
    let isMini = true;

    return (
      <div className={"CardTable "
        + (this.state.opening ? "selecting" : "")
        + (this.state.s.ownInfo && this.state.s.ownInfo.inTurn ? " in-turn" : "")
        + (this.state.s.phase >= 5 ? " round-ended" : "")
        + (this.state.s.players.length < 2 ? " small-game" : "")
        + (isMini ? " mini" : "")}>
          {this.createPlayers()}
        <div id="gamearea" className={"turn-indicator " + (this.state.s.ownInfo && this.state.s.ownInfo.inTurn ? "in-turn" : "")}>
          <div id="controlrow">
            <div id="infocolumn">
              <div id="roundinfo">Kierros {this.props.stateManager.state.round.roundNumber}/8 &ndash; {this.props.stateManager.state.round.roundName}</div>
              <div id="instructions">
                {false && isMini ? "" : this.createInstructions()}
              </div>
            </div>
            <div id="controls">
              {this.createControls()}
            </div>
          </div>
          <div id="deckrow">
            <div id="deck" className={this.state.s.can.pick ? "canDrag" : ""}></div>
            <div id="pile" className={(this.state.s.can.pick ? "canDrag" : "") + (this.state.s.can.discard ? " canDrop" : "")}></div>
            <div id="controls2">
              {this.createControls2()}
            </div>
            <div className="spacer"></div>
            {imGuest ? "" :
              this.state.s.ownInfo.open.map((h, i) => <Hand key={"m" + i} id={"myopen" + i} classes="player-hand open-hand"></Hand>)
            }
          </div>
          {imGuest ? "" : (
            <div id="my-closed-hand-sections" className={"turn-indicator " + (this.state.s.ownInfo && this.state.s.ownInfo.inTurn ? "in-turn" : "")}>
              {this.createMySections()}
              {this.state.s.can.reveal ? this.actionButton('light', 'Paljasta korttisi', 'reveal') : ""}
              <div id="newsection" className="new-section" style={{ visibility: (this.state.s.phase >= 2 && this.state.s.phase <= 4) ? "visible" : "hidden" }}><div>+</div></div>
            </div>)}
        </div>
      </div>
    );
  }
}

export default CardTable;
