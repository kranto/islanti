import React, { Component } from "react";

let readFromLocalStorage = () => {
  let item = window.localStorage.getItem('IslantiState') || "{}";
  return JSON.parse(item);
}

class Lobby extends Component {

  constructor() {
    super();
    let localState = readFromLocalStorage() || {};

    this.state = {
      gameId: null,
      participationId: localState.participationId,
      phase: localState.participationId ? 3 : 1,
      joinedGame: false,
      code: "",
      errorMsg: "",
      newGame: false,
      loading: false,
      nickEntered: false,
      nick: localState.nick || ""
    };
  }

  componentDidUpdate() {
    if (this.state.phase === 3 && this.props.lobbyReady && !this.state.joinedGame) {
      this.resumeParticipation();
    } else if (this.state.joinedGame) {
      this.props.goToGame(this.gameId, this.participationId);
    }
  }

  writeLocalStorage() {
    let item =  {nick: this.state.nick, gameId: this.state.gameId, participationId: this.state.participationId};
    window.localStorage.setItem('IslantiState', JSON.stringify(item) );
  }

  onCodeChanged = (event) => {
    this.setState({ code: event.target.value, errorMsg: "" });
  }

  onCodeReady = () => {
    this.setState({ loading: true });
    this.props.stateManager.findGame(this.state.code, (result) => {
      if (result.ok) {
        this.setState({loading: false, phase: 2, gameId: result.gameId, gameCreatedBy: result.createdBy, gameCreatedAt: result.createdAt});
      } else {
        this.setState({loading: false, code: "", phase: 1, errorMsg: result.msg});
      }
    });
  }

  onNewGameClicked = () => {
    this.setState({ newGame: true, phase: 2 });
  }

  onNickChanged = (event) => {
    this.setState({ nick: event.target.value });
  }

  onNickReady = () => {
    this.setState({ loading: true });
    this.writeLocalStorage();
    console.log(this.state.newGame ? "Aloitetaan uusi peli" : "Liitytään peliin " + this.state.code, this.state.nick);
    if (this.state.newGame) {
      this.createGame();
    } else {
      this.joinGame();
    }
  }

  createGame = () => {
    this.props.stateManager.createGame(this.state.nick, (result) => {
      if (result.ok) {
        this.setState({loading: false, participationId: result.participationId, gameId: result.gameId, nick: result.nick, phase: 3, joinedGame: true});
      } else {
        this.setState({loading: false, errorMsg: result.msg, code: "", participationId: undefined, gameId: undefined, phase: 1, joinedGame: false});
      }
      this.writeLocalStorage();
    });
  }

  joinGame = () => {
    this.props.stateManager.joinGame(this.state.gameId, this.state.nick, (result) => {
      if (result.ok) {
        this.setState({loading: false, participationId: result.participationId, gameId: result.gameId, nick: result.nick, phase: 3, joinedGame: true});
      } else {
        this.setState({loading: false, errorMsg: result.msg, code: "", participationId: undefined, gameId: undefined, phase: 1, joinedGame: false});
      }
      this.writeLocalStorage();
    });
  }

  resumeParticipation = () => {
    if (this.validating) return;
    this.validating = true;
    this.setState({loading: true});
    this.props.stateManager.resumeParticipation(this.state.participationId, (result) => {
      if (result.ok) {
        this.setState({loading: false, participationId: result.participationId, gameId: result.gameId, nick: result.nick, phase: 3, joinedGame: true});
      } else {
        this.setState({loading: false, code: "", participationId: undefined, gameId: undefined, phase: 1, joinedGame: false});
      }
      this.writeLocalStorage();
      this.validating = false;
    });
  }

  render() {
    return (
      <div className="Lobby">
        {this.state.phase !== 1 ? "" :
          <div style={{ height: "100%", display: "flex", flexFlow: "column nowrap", justifyContent: "space-around", alignItems: "center" }}>
            <div></div>
            <div id="enterCodeView">
              <h1>Liity peliin</h1>
              <div className="form-group">
                <label htmlFor="inputGameCode">Osallistumiskoodi</label>
                <input autoFocus type="text" className="form-control" id="inputGameCode" maxLength="4" minLength="4" value={this.state.code} onChange={this.onCodeChanged} disabled={this.state.loading} />
                <small id="gameIdHelp" className="form-text text-muted text-gray">Syötä saamasi nelinumeroinen osallistumiskoodi</small>
                <div style={{ visibility: this.state.code.length === 4 ? "visible" : "hidden" }}>
                  <button type="button" className="btn btn-dark" onClick={this.onCodeReady} disabled={this.state.loading}>
                    Osallistu...
                  </button>
                  <br />
                  <div className="spinner-border spinner-border-sm" role="status" style={{ visibility: this.state.loading ? "visible" : "hidden" }}>
                    <span className="sr-only">Ladataan...</span>
                  </div>
                </div>
              </div>
              <div>{this.state.errorMsg}<span>&nbsp;</span></div>
            </div>
            <div id="newGame" style={{ visibility: this.state.code.length === 0 ? "visible" : "hidden" }}>
              <button type="button" className="btn btn-dark" onClick={this.onNewGameClicked} disabled={this.state.code.length > 0}>
                Tai aloita uusi peli...
            </button>
            </div>
          </div>
        }
        {this.state.phase !== 2 ? "" :
          <div>
            {this.state.newGame ?
              <h1>Uusi peli</h1>
              :
              <div>
                <h1>Liity peliin <small>{this.state.code}</small></h1>
                <small className="text-muted text-gray">Pelin aloitti {this.state.gameCreatedBy}</small>
              </div>
            }
            <div className="form-group">
              <label htmlFor="inputNick">Anna nimimerkkisi</label>
              <input autoFocus type="text" className="form-control" id="inputNick" minLength="1" maxLength="20" value={this.state.nick} onChange={this.onNickChanged} />
              <small id="nickHelp" className="form-text text-muted text-gray">Voit käyttää eri nimimerkkejä eri peleissä</small>
              <button type="button" className="btn btn-dark" onClick={this.onNickReady} style={{ visibility: this.state.nick.length > 0 ? "visible" : "hidden" }}>{this.state.newGame ? "Aloita uusi peli" : "Liity peliin"}</button>
              <div className="spinner-border spinner-border-sm" role="status" style={{ visibility: this.state.loading ? "visible" : "hidden" }}>
                <span className="sr-only">Ladataan...</span>
              </div>
            </div>
          </div>
        }
      </div>
    );
  }
}

export default Lobby;
