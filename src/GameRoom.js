import 'bootstrap/dist/css/bootstrap.min.css';
import React, { Component } from "react";
import CardTable from './CardTable.js';

class GameRoom extends Component {

  constructor() {
    super();
    this.state = {
      phase: 1,
      codeEntered: false,
      code: "",
      gameId: null,
      newGame: false,
      loading: false,
      nickEntered: false,
      nick: ""
    };
  }

  componentDidMount() {
  }

  onCodeChanged = (event) => {
    this.setState({ code: event.target.value });
  }

  onCodeReady = () => {
    this.setState({ loading: true });
    this.props.stateManager.findGame(this.state.code, (result) => {
      this.setState({loading: false, codeEntered: true, phase: 2, gameId: result.gameId, gameCreatedBy: result.createdBy, gameCreatedAt: result.createdAt});
    })
    // setTimeout(() => this.setState({ loading: false, codeEntered: true, phase: 2 }), 2000);
  }

  onNewGameClicked = () => {
    this.setState({ newGame: true, phase: 2 });
  }

  onNickChanged = (event) => {
    this.setState({ nick: event.target.value });
  }

  onNickReady = () => {
    this.setState({ nickEntered: true, loading: true });
    console.log(this.state.newGame ? "Aloitetaan uusi peli" : "Liitytään peliin " + this.state.code, this.state.nick);
    this.props.stateManager.joinGame(this.state.gameId, this.state.nick, (result) => {
      this.setState({loading: false});
      this.props.goToGame(result);
    })
  }

  render() {
    return (
      <div className="GameRoom">
        {this.state.phase > 1 ? "" :
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
            </div>
            <div id="newGame" style={{ visibility: this.state.code.length === 0 ? "visible" : "hidden" }}>
              <button type="button" className="btn btn-dark" onClick={this.onNewGameClicked} disabled={this.state.code.length > 0}>
                Tai aloita uusi peli...
            </button>
            </div>
          </div>
        }
        {this.state.phase < 2 ? "" :
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

export default GameRoom;
