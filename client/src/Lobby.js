import React, { Component } from "react";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const pad = (num, size) => ("00000" + num).substring(5 + ("" + num).length - size);

const readFromLocalStorage = () => {
  const stringItem = window.localStorage.getItem('IslantiState') || "{}";
  return JSON.parse(stringItem);
}

const writeToLocalStorage = (object) => {
  window.localStorage.setItem('IslantiState', JSON.stringify(object));
}

const readOpenParticipations = () => {
  const stringItem = window.localStorage.getItem('IslantiOpenParticipations') || "[]";
  return JSON.parse(stringItem);
}

const writeOpenParticipations = (object) => {
  window.localStorage.setItem('IslantiOpenParticipations', JSON.stringify(object));
}

const getHumanFriendlyTime = (dateStr) => {

  const date = new Date(dateStr);
  const now = new Date();
  const delta = Math.round((now - date) / 1000);

  if (delta < 60) {
    return "hetki sitten";
  } else if (delta < 2 * 60) {
    return 'minuutti sitten';
  } else if (delta < 3600) {
    return Math.floor(delta / 60) + ' minuuttia sitten';
  } else if (delta < 24 * 3600 && now.getDate() === date.getDate()) {
    return date.getHours() + "." + pad(date.getMinutes(),2);
  } else if (delta < 2 * 24 * 3600 && now.getDate() === date.getDate() + 1) {
    return "eilen";
  } else {
    return date.getDate() + "." + (date.getMonth()+1) + ".";
  }
};

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

  static resetParticipation() {
    console.log("Lobby.resetParticipation");
    let state = readFromLocalStorage();
    state = { ...state, game: undefined, participation: undefined };
    writeToLocalStorage(state);
    console.log(readFromLocalStorage());
  }

  componentDidMount() {
    console.log("Lobby component did mount");
    if (window.location.search.length > 1) {
      window.history.replaceState({}, "", window.location.href.split('?')[0]);
    }
    this.setState({});
  }

  componentDidUpdate() {
    console.log("Lobby component did update", this.state);
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
        let openParticipations = readOpenParticipations();
        if (openParticipations.indexOf(result.participation.token) < 0) {
          openParticipations.push(result.participation.token);
          writeOpenParticipations(openParticipations);  
        }
      } else {
        this.setState({ loading: false, code: "", participation: undefined, game: undefined, phase: 0, joinedGame: false });
      }
      this.saveState();
      this.validating = false;
    });
  }

  resumeParticipationWithToken = token => {
    this.setState({ participation: token, phase: 3 });
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
    } else {
      this.setState({ loading: false, openParticipations: [], phase: 1 });
    }

  }

  exitGame = (event, index) => {
    event.stopPropagation();
    let participation = this.state.openParticipations[index].participation;
    console.log(participation);
    if (participation.isGuest) {
      if (window.confirm("Haluatko varmasti lopettaa pelin seuraamisen?")) {
        writeOpenParticipations(readOpenParticipations().filter(token => token !== participation.token));
        this.setState({ phase: 0 });
      }
      return;
    }

    if (window.confirm("Haluatko varmasti poistua pelistä lopullisesti?")) {
      this.props.stateManager.exitGameWithToken(participation.token, result => {
        this.setState({ phase: 0 });
      });
    }
  }

  createRejoinGameView = () => {
    if (this.state.openParticipations.length === 0) return "";
    return (
      <div>
        <h1>Käynnissä olevat pelisi</h1>
        <table id="rejoinGameTable" className="table table-hover">
          <tbody>
            <tr><th>Aloitettu</th><th>Pelaajat</th><th>Kierros</th><th></th></tr>
            {this.state.openParticipations.map((p, i) => (
              <tr className="openGame" key={i} onClick={() => this.resumeParticipationWithToken(p.participation.token)}>
                <td>{getHumanFriendlyTime(p.game.createdAt)}</td>
                <td>{p.game.players.map(p => p.nick).join(", ")}</td>
                <td>{!p.game.locked ? "alkamassa" : p.game.ended ? "päättynyt" : p.game.roundNumber + "/8"}</td>
                <td><button className="btn btn-warning exit-button" onClick={(event) => this.exitGame(event, i)}>
                  <FontAwesomeIcon icon={['fas', 'trash']} size="1x" />
                </button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <small id="gameHelp" className="form-text text-muted text-gray">Klikkaa peliä jatkaaksesi</small>
      </div>
    )
  }

  createEnterCodeView = () => {
    return (
      <div id="enterCodeView">
        <h1>Osallistu peliin</h1>
        <div className="form-group">
          <label htmlFor="inputGameCode">Osallistumiskoodi</label>
          <input autoFocus type="text" className="form-control" id="inputGameCode" maxLength="4" minLength="4" value={this.state.code} onChange={this.onCodeChanged} disabled={this.state.loading} />
          <small id="gameHelp" className="form-text text-muted text-gray">Syötä pelinjohtajalta saamasi nelinumeroinen osallistumiskoodi</small>
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
