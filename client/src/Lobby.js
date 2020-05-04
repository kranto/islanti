import React, { Component } from "react";

let readFromLocalStorage = () => {
  let stringItem = window.localStorage.getItem('IslantiState') || "{}";
  return JSON.parse(stringItem);
}

let writeToLocalStorage = (object) => {
  window.localStorage.setItem('IslantiState', JSON.stringify(object));
}

let readOpenParticipations = () => {
  let stringItem = window.localStorage.getItem('IslantiOpenParticipations') || "[]";
  return JSON.parse(stringItem);
}

let writeOpenParticipations = (object) => {
  window.localStorage.setItem('IslantiOpenParticipations', JSON.stringify(object));
}

class Lobby extends Component {

  constructor() {
    super();

    let participationFromUri = "";
    let query = window.location.search.substring(1);
    if (query.length > 0) {
      query.split("&").forEach(q => {
        let [key, value] = q.split("=");
        if (key === "pid") participationFromUri = value;
      });
    }

    let localState = readFromLocalStorage() || {};
    let participation = participationFromUri ? participationFromUri : localState.participation;

    this.state = {
      game: null,
      participation: participation,
      phase: participation ? 3 : 0,
      joinedGame: false,
      code: "",
      errorMsg: "",
      newGame: false,
      loading: false,
      nickEntered: false,
      nick: localState.nick || ""
    };

    console.log('entered lobby')
  }

  static resetState() {
    let state = readFromLocalStorage();
    state = { ...state, game: undefined, participation: undefined };
    writeToLocalStorage(state);
  }

  componentDidMount() {
    if (window.location.search.length > 1) {
      window.history.replaceState({}, "", window.location.href.split('?')[0]);
    }
  }

  componentDidUpdate() {
    if (!this.state) return;
    if (this.state.phase === 3 && this.props.lobbyReady && !this.state.joinedGame) {
      this.resumeParticipation();
    } else if (this.state.joinedGame) {
      this.props.goToGame(this.state.game, this.state.participation);
    } else if (this.state.phase === 0 && this.props.lobbyReady) {
      this.refreshOpenParticipations();
    }
  }

  saveState() {
    let savedState = { nick: this.state.nick, game: this.state.game, participation: this.state.participation };
    writeToLocalStorage(savedState);
  }

  onCodeChanged = (event) => {
    this.setState({ code: event.target.value, errorMsg: "" });
  }

  onCodeReady = () => {
    this.setState({ loading: true });
    this.props.stateManager.findGame(this.state.code, (result) => {
      if (result.ok) {
        this.setState({ loading: false, phase: 2, game: result.game, gameCreatedBy: result.createdBy, gameCreatedAt: result.createdAt });
      } else {
        this.setState({ loading: false, code: "", phase: 1, errorMsg: result.msg });
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
    this.saveState();
    if (this.state.newGame) {
      this.createGame();
    } else {
      this.joinGame();
    }
  }

  createGame = () => {
    this.props.stateManager.createGame(this.state.nick, (result) => {
      if (result.ok) {
        this.setState({ loading: false, participation: result.participation.token, nick: result.participation.nick, game: result.game, phase: 3, joinedGame: true });
        let openParticipations = readOpenParticipations();
        openParticipations.push(result.participation.token);
        writeOpenParticipations(openParticipations);
      } else {
        this.setState({ loading: false, errorMsg: result.msg, code: "", participation: undefined, game: undefined, phase: 1, joinedGame: false });
      }
      this.saveState();
    });
  }

  joinGame = () => {
    this.props.stateManager.joinGame(this.state.game, this.state.nick, (result) => {
      if (result.ok) {
        this.setState({ loading: false, participation: result.participation.token, nick: result.participation.nick, game: result.game, phase: 3, joinedGame: true });
        let openParticipations = readOpenParticipations();
        if (openParticipations.indexOf(result.participation.token) < 0) {
          openParticipations.push(result.participation.token);
          writeOpenParticipations(openParticipations);
        }
      } else {
        this.setState({ loading: false, errorMsg: result.msg, code: "", participation: undefined, game: undefined, phase: 1, joinedGame: false });
      }
      this.saveState();
    });
  }

  resumeParticipation = () => {
    if (this.validating) return;
    this.validating = true;
    this.setState({ loading: true });
    this.props.stateManager.resumeParticipation(this.state.participation, (result) => {
      if (result.ok) {
        this.setState({ loading: false, participation: result.participation.token, game: result.game, nick: result.participation.nick, phase: 3, joinedGame: true });
      } else {
        this.setState({ loading: false, code: "", participation: undefined, game: undefined, phase: 0, joinedGame: false });
      }
      this.saveState();
      this.validating = false;
    });
  }

  resumeParticipationWithToken = token => {
    this.setState({participation: token, phase: 3});
  }

  refreshOpenParticipations = () => {
    let openParticipations = readOpenParticipations();
    if (openParticipations.length > 0) {
      this.props.stateManager.validateParticipations(openParticipations, result => {
        if (result.ok) {
          this.setState({ loading: false, openParticipations: result.participations, phase: 1 });
        } else {
          this.setState({ loading: false, phase: 1, openParticipations: null, errorMsg: "Avoimia pelejä ei voitu ladata" });
        }
        writeOpenParticipations(result.participations.map(p => p.participation.token));
      });
    }

  }

  createRejoinGameView = () => {
    if (this.state.openParticipations.length === 0) return "";
    return (
      <div>
      <h1>Keskeneräiset pelit</h1>
      <table id="rejoinGameTable">
        <tbody>
          <tr><th>Pelinjohtaja</th><th>Muut pelaajat</th><th>Aloitettu</th><th>Kierros</th><th></th><th></th></tr>
          {this.state.openParticipations.map((p, i) => (
            <tr className="openGame" key={i}>
              <td>{p.game.createdBy}</td>
              <td>{p.game.players.slice(1).map(p => p.nick).join(", ")}</td>
              <td>{p.game.createdAt}</td>
              <td>{p.game.roundNumber}</td>
              <td><button onClick={() => this.resumeParticipationWithToken(p.participation.token)}>Jatka peliä</button></td>
              <td><button>Poistu pelistä</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    )
  }

  createEnterCodeView = () => {
    return (
      <div id="enterCodeView">
        <h1>Liity peliin</h1>
        <div className="form-group">
          <label htmlFor="inputGameCode">Kutsukoodi</label>
          <input autoFocus type="text" className="form-control" id="inputGameCode" maxLength="4" minLength="4" value={this.state.code} onChange={this.onCodeChanged} disabled={this.state.loading} />
          <small id="gameHelp" className="form-text text-muted text-gray">Syötä pelinjohtajalta saamasi nelinumeroinen kutsukoodi</small>
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
    )
  }

  render() {
    if (!this.state || !this.props.lobbyReady || this.state.phase === 3) return <div className="Lobby"></div>;
    return (
      <div className="Lobby">
        {this.state.phase !== 1 ? "" :
          <div style={{ height: "100%", display: "flex", flexFlow: "column nowrap", justifyContent: "space-around", alignItems: "center" }}>
            <div style={{ fontSize: "3em" }}>I S L A N T I
              <img src="lobby.png" alt="logo" width="100" height="100" style={{ position: "relative", top: "-10px", marginLeft: "30px", verticalAlign: "middle" }}></img>
            </div>
            {this.createRejoinGameView()}
            {this.createEnterCodeView()}
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
              <button type="button" className="btn btn-dark" onClick={this.onNickReady}
                disabled={this.state.loading}
                style={{ visibility: this.state.nick.length > 0 ? "visible" : "hidden" }}>
                {this.state.newGame ? "Aloita uusi peli" : "Liity peliin"}
              </button>
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
