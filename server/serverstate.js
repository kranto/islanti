const storage = require('./storage');
const rules = require('./islantiRules');
const utils = require('./cardUtils');

const gamestates = {};

const EventEmitter = require('events');

const deepCopy = object => object !== undefined ? JSON.parse(JSON.stringify(object)) : object;

class Connector  {
  constructor(serverstate, playerGameIndex, socket) {
    this.serverstate = serverstate;
    this.playerGameIndex = playerGameIndex;
    this.imOwner = playerGameIndex === 0;
    this.imGuest = playerGameIndex === null;
    this.playerRoundIndex = null;
    this.socket = socket;

    this.socket.on('exitGame', async args => {
      console.log('connector.exitGame', this.playerGameIndex, args);
      await this.serverstate.exitGame(this.playerGameIndex, args);
    });

    this.socket.on('discardGame', async args => {
      console.log('connector.discardGame', this.playerGameIndex, args);
      await this.serverstate.discardGame(this.playerGameIndex, args);
    });

    this.socket.on('gameAction', async args => {
      console.log('connector.onGameAction', this.playerGameIndex, args);
      await this.serverstate.onGameAction(this.playerGameIndex, args);
    });

    this.socket.on('action', args => {
      console.log('connector.onAction', this.playerRoundIndex, args);
      this.serverstate.onAction(this.playerRoundIndex, args);
    });

    this.socket.on('validateSelection', (args, callback) => {
      console.log('connector.validateSelection', this.playerRoundIndex, args, callback);
      this.serverstate.validateSelection(this.playerRoundIndex, args, callback);
    });

    this.socket.on('state', () => {
      this.stateChange({action: 'gameState', state: this.serverstate.game});
      this.stateChange({action: 'round', state: this.serverstate.round});
      this.stateChange({action: 'roundState', state: this.serverstate.getRoundState()});
    });

    this.socket.on('ping1', () => {
      this.socket.emit('pong1');
    });

    this.socket.emit('authenticated');

    this.serverstate.eventEmitter.on('stateChange', this.stateChange);
  }

  removeListeners() {
    console.log('removing listener', this.playerGameIndex);
    this.serverstate.eventEmitter.removeListener('stateChange', this.stateChange);
  }

  stateChange = (change) => {
    console.log('connector.stateChange', this.playerGameIndex, change.action);
    let state = deepCopy(change.state);
    switch (change.action) {
      case 'gameState':
        state.imOwner = this.imOwner;
        break;
      case 'round':
        break;
      case 'roundState':
        console.log('connector.stateChange.roundState', this.playerGameIndex, change.state.index, change.state.phase);

        if (state.phase > this.serverstate.BEGIN) {
          this.playerRoundIndex = this.serverstate.gameIndexToRoundIndex(this.playerGameIndex);
          if (!this.imGuest) state.players = [...state.players.slice(this.playerRoundIndex, state.players.length), ...state.players.slice(0,this.playerRoundIndex)];
          state.playerInTurn = this.rollIndex(state.playerInTurn, state);
          state.buying = this.rollIndex(state.buying, state);
          state.winner = this.rollIndex(state.winner, state);
          state.myhands = this.imGuest ? null : state.players.splice(0, 1)[0];  // --- create myhands, remove from players ---
          state.myTurn = state.playerInTurn < 0;
          state.players = state.players.map(p => ({...p, validity: undefined, closed: p.closed ? utils.anonymise(p.closed.flat()) : []}));
          state.can = {
            deal: state.phase === this.serverstate.DEAL && state.myTurn,
            show: state.phase === this.serverstate.SHOW_CARD && state.myTurn,
            pick: (state.phase === this.serverstate.PICK_CARD || state.phase === this.serverstate.PICK_CARD_BOUGHT) && state.myTurn,
            buy: !this.imGuest && state.phase === this.serverstate.PICK_CARD && (state.playerInTurn >= 1 || !state.myTurn && state.turnIndex === 1) && state.myhands.bought < 3,
            sell: state.phase === this.serverstate.PICK_CARD_BUYING && state.myTurn,
            open: state.phase === this.serverstate.TURN_ACTIVE && state.myTurn && !state.myhands.opened,
            complete: state.phase === this.serverstate.TURN_ACTIVE && state.myTurn && state.myhands.opened,
            discard: state.phase === this.serverstate.TURN_ACTIVE && state.myTurn,
            startNextRound: state.phase === this.serverstate.ROUND_ENDED && this.imOwner && this.serverstate.game.roundNumber < 8,
            endGame: state.phase === this.serverstate.ROUND_ENDED && this.imOwner && this.serverstate.game.roundNumber === 8
          };
        }
        break;
    }
    change = {...change, state: state};
    this.socket.emit('stateChange', change);
  }

  rollIndex(player, state) {
    if (player === null || player === undefined) return null;
    if (this.imGuest) return player;
    return player === null ? null : (((player + state.players.length - this.playerRoundIndex) % state.players.length) - 1);
  }

}

class ServerState {

  BEGIN = 0;
  DEAL = 1;
  SHOW_CARD = 2;
  PICK_CARD = 3;
  PICK_CARD_BUYING = 3.1;
  PICK_CARD_BOUGHT = 3.2;
  TURN_ACTIVE = 4;
  ROUND_ENDED = 5;
  GAME_ENDED = 6;

  constructor(io, gameToken) {
    this.gameToken = gameToken;
    this.io = io.of('/game/' + gameToken);

    this.connectors = [];
    this.roundState = false;

    this.eventEmitter = new EventEmitter();
  }

  async init() {
    console.log(this.gameToken + ' initializing');
    // read game from db
    let initialRoundState = {
      index: 0,
      phase: this.BEGIN
    };

    let savedState = await storage.findRoundState(this.gameToken);
    this.roundState = savedState ? savedState : initialRoundState;
    this.roundState.index = 0;

    await this.onGameUpdated();

    this.io.on('connection', socket => {
      console.log('someone connected to ' + this.gameToken, new Date());
      socket.once('authenticate', (args, callback) => {
        console.log('authenticate', args);
        let matching = this.game.players.map((p, i) => ({...p, index: i})).filter(p => p.token === args.participation);
        let player = matching.length === 1 ? matching[0] : null;
        console.log(player.nick + ' authenticated',  args, callback);
        let connector = new Connector(this, player.index, socket);
        this.connectors.push(connector);
        if (callback) callback({authenticated: true, myName: player.nick});
        this.updateConnected();
        socket.on('disconnect', () => {
          console.log(player.nick + ' disconnected', connector.playerGameIndex);
          this.connectors = this.connectors.filter(c => c !== connector);
          connector.removeListeners();
        });
      });
    });
  }

  updateConnected() {

  }

  gameIndexToRoundIndex(index) {
    return this.game.playerOrder ? this.game.playerOrder.indexOf(index) : null;
  }

  onAction(index, args) {
    console.log('onAction', index, args);
    if (index === null) {
      console.log('playerRoundIndex === null -> ignored');
      return;
    }

    switch (args.action) {
      case 'deal':
        this.deal(index);
        break;
      case 'showCard':
        this.showCard(index);
        break;
      case 'newOrder':
        this.newOrder(index, args.order);
        break;
      case 'pickCard':
        this.pickCard(index, args.fromDeck);
        break;
      case 'requestToBuy':
        this.requestToBuy(index);
        break;
      case 'sell':
        this.sell(index);
        break;
      case 'dontsell':
        this.dontsell(index);
        break;
      case 'discarded':
        this.discarded(index, args.card);
        break;
      case 'open':
        this.open(index, args.selectedIndices);
        break;
      case 'complete':
        this.complete(index, args.player, args.hand, args.card, args.dropIndex);
        break;
      }
  }

  async exitGame(playerGameIndex) {
    if (playerGameIndex === 0 || this.roundState.phase !== this.BEGIN) return false;
    this.game.players.splice(playerGameIndex, 1);
    await this.notifyGameUpdated(true);
  }

  async discardGame(playerGameIndex) {
    if (playerGameIndex !== 0 || this.roundState.phase !== this.BEGIN) return false;
    this.game.locked = true;
    this.game.ended = true;
    await this.notifyGameUpdated(true);
  }

  async onGameUpdated() {
    this.game = await storage.findGameByToken(this.gameToken);
    this.round = rules.ROUNDS[this.game.roundNumber-1];
    this.notifyRoundUpdated();
    this.notifyGameUpdated(false);
  }

  async onGameAction(playerGameIndex, args) {
    console.log('onGameAction', playerGameIndex, args);
    switch (args.action) {
      case 'startGame':
        await this.startGame(playerGameIndex);
        break;
      case 'nextRound':
        await this.nextRound(playerGameIndex);
        break;
      case 'endGame':
        await this.endGame(playerGameIndex);
        break;
      }
  }

  async startGame(playerGameIndex) {
    console.log('startGame', playerGameIndex, this.game.token, this.roundState.phase);
    if (playerGameIndex !== 0 || this.roundState.phase !== this.BEGIN) return false;

    this.game.locked = true;
    this.game.ended = false;
    this.game.roundNumber = 1;
    this.game.dealer = 0;

    this.game.playerOrder = utils.shuffle([...Array(this.game.players.length).keys()]);
    this.game.players.forEach((p, i) => {p.order = this.game.playerOrder.indexOf(i); p.index = i;});

    await this.notifyGameUpdated(true);

    this.startRound(playerGameIndex);
  }

  async nextRound(playerGameIndex) {
    console.log('nextRound', playerGameIndex, this.game.token, this.roundState.phase);
    if (playerGameIndex !== 0 || this.roundState.phase !== this.ROUND_ENDED || this.roundState.roundNumber >= 8) return false;

    this.game.roundNumber++;
    this.game.dealer = (this.game.dealer + 1) % this.game.players.length;

    await this.notifyGameUpdated(true);

    this.startRound(playerGameIndex);
  }

  startRound(playerGameIndex) {
    console.log('startRound', this.game.token, playerGameIndex, this.game.roundNumber, this.game.dealer);
    this.cards = utils.createCardsAndShuffle();

    this.round = rules.ROUNDS[this.game.roundNumber - 1];
    this.notifyRoundUpdated();

    this.roundState = {
      ...this.roundState,
      turnIndex: 0,
      playerInTurn: this.game.dealer,
      phase: this.DEAL,
      dealt: false,
      buying: null,
      winner: null,
      deck: [...this.cards],
      pile: [],
      players: this.game.playerOrder.map((po, i) => ({
        index: i,
        name: this.game.players[po].nick,
        closed: [[]],
        validity: [{}],
        open: [],
        opened: false,
        inTurn: this.game.dealer === i,
        bought: 0
      }))
    };

    this.roundState.index++;

    this.notifyConnectors(true);
  }

  async endGame(playerGameIndex) {
    console.log('endGame', playerGameIndex, this.game.token, this.roundState.phase);
    if (playerGameIndex !== 0 || this.roundState.phase !== this.ROUND_ENDED || this.round.roundNumber !== 8) return false;

    this.game.ended = true;
    this.game.endedAt = new Date();

    await this.notifyGameUpdated(true);

    this.roundState.phase = this.GAME_ENDED;
    this.notifyConnectors(true);
  }

  async notifyConnectors(saveState) {
    if (saveState) await storage.writeRoundState({...this.roundState, index: undefined, _id: undefined}, this.game.token);
    this.eventEmitter.emit('stateChange', {action: 'roundState', state: this.getRoundState()});
  }

  async notifyGameUpdated(saveState) {
    if (saveState) await storage.updateGame(this.game);
    this.eventEmitter.emit('stateChange', {action: 'gameState', state: this.game});
  }

  async notifyRoundUpdated() {
    this.eventEmitter.emit('stateChange', {action: 'round', state: this.round});
  }

  getRoundState() {
    let deck = this.roundState.deck ? utils.cardsToString(this.roundState.deck) : [];
    let pile = this.roundState.pile ? utils.cardsToString(this.roundState.pile) : [];
    return {
      ...this.roundState,
      players: this.roundState.players ? this.roundState.players.map(p => ({...p, closed: p.closed.map(utils.cardsToString), open: p.open.map(hand => ({...hand, cards: utils.cardsToString(hand.cards)}))})) : null,
      deck: utils.anonymise(deck),
      pile: [...pile.slice(0,2), ...utils.anonymise(pile.slice(2)) ]
    };
  }

  deal(playerRoundIndex) {
    console.log('deal', playerRoundIndex);
    if (playerRoundIndex !== this.roundState.playerInTurn || this.roundState.phase !== this.DEAL || this.roundState.dealt) return false;
    this.roundState.dealt = true;
    [...Array(13).keys()].forEach(() => this.roundState.players.forEach(p => p.closed[0].push(this.roundState.deck.shift())));
    this.nextPlayerInTurn();
    this.roundState.phase = this.SHOW_CARD;
    this.roundState.index++;
    this.notifyConnectors(true);
    return true;
  }

  newOrder(playerRoundIndex, newCardOrder) {
    console.log('newOrder', playerRoundIndex, newCardOrder);
    if (this.phase < this.SHOW_CARD || this.phase >= this.ROUND_ENDED) return false;
    let playersCards = this.roundState.players[playerRoundIndex].closed.flat();
    let cardIds = playersCards.map(card => card.i);
    let cardsById = playersCards.reduce((acc, card) => ({...acc, [card.i]: card}), {});
    if ([...cardIds].sort().join(',') !== [...newCardOrder.flat()].sort().join(',')) {
      console.log('different cards.')
      return false;
    }

    let newSections = newCardOrder.map(section => section.map(id => cardsById[id]));

    this.roundState.players[playerRoundIndex].closed = newSections;
    this.roundState.players[playerRoundIndex].validity = newSections.map(section => rules.testSection(section, this.round));
    this.roundState.index++;
    this.notifyConnectors(false);
    return true;
  }

  showCard(playerRoundIndex) {
    console.log('showCard', playerRoundIndex);
    if (playerRoundIndex !== this.roundState.playerInTurn || this.roundState.phase !== this.SHOW_CARD) return false;
    this.roundState.pile.unshift(this.roundState.deck.shift());
    this.roundState.phase = this.PICK_CARD;
    this.roundState.index++;
    this.notifyConnectors(true);
  }

  pickCard(playerRoundIndex, fromDeck) {
    console.log('pickCard', playerRoundIndex, fromDeck);
    if (playerRoundIndex !== this.roundState.playerInTurn || (this.roundState.phase !== this.PICK_CARD && this.roundState.phase !== this.PICK_CARD_BOUGHT)) return false;
    let card = fromDeck ? this.roundState.deck.shift() : this.roundState.pile.shift();
    this.checkDeck();
    this.roundState.players[playerRoundIndex].closed[0].unshift(card);
    this.roundState.players[playerRoundIndex].validity[0] = rules.testSection(this.roundState.players[playerRoundIndex].closed[0], this.round);

    this.roundState.phase = this.TURN_ACTIVE;
    this.roundState.index++;
    this.notifyConnectors(true);
  }

  requestToBuy(playerRoundIndex) {
    console.log('requestToBuy', playerRoundIndex);
    if (playerRoundIndex === this.roundState.playerInTurn || this.roundState.phase !== this.PICK_CARD || 
      (this.turnIndex > 1 && playerRoundIndex === this.previousPlayer(this.roundState.playerInTurn))) return false;
    this.roundState.phase = this.PICK_CARD_BUYING;
    this.roundState.buying = playerRoundIndex;
    this.roundState.index++;
    this.notifyConnectors(true);
  }

  sell(playerRoundIndex) {
    console.log('sell', playerRoundIndex);
    if (playerRoundIndex !== this.roundState.playerInTurn || this.roundState.phase !== this.PICK_CARD_BUYING) return false;
    this.roundState.players[this.roundState.buying].closed[0].unshift(this.roundState.pile.shift());
    this.roundState.players[this.roundState.buying].closed[0].unshift(this.roundState.deck.shift());
    this.roundState.players[this.roundState.buying].validity[0] = rules.testSection(this.roundState.players[this.roundState.buying].closed[0], this.round);
    this.checkDeck();
    this.roundState.players[this.roundState.buying].bought++;
    this.roundState.buying = null;
    this.roundState.phase = this.PICK_CARD_BOUGHT;
    this.roundState.index++;
    this.notifyConnectors(true);
  }

  dontsell(playerRoundIndex) {
    console.log('dontsell', playerRoundIndex);
    if (playerRoundIndex !== this.roundState.playerInTurn || this.roundState.phase !== this.PICK_CARD_BUYING) return false;
    this.roundState.players[playerRoundIndex].closed[0].unshift(this.roundState.pile.shift());
    this.roundState.players[playerRoundIndex].validity[0] = rules.testSection(this.roundState.players[playerRoundIndex].closed[0], this.round);
    this.roundState.buying = null;
    this.roundState.phase = this.TURN_ACTIVE;
    this.roundState.index++;
    this.notifyConnectors(true);
  }

  discarded(playerRoundIndex, cardId) {
    console.log('discarded', playerRoundIndex, cardId);
    if (playerRoundIndex !== this.roundState.playerInTurn || this.roundState.phase !== this.TURN_ACTIVE) return false;
    let p = this.roundState.players[playerRoundIndex];
    let matchingCards = p.closed.flat().filter(c => c.i === cardId);
    if (matchingCards.length !== 1) return; // not found
    let card = matchingCards[0];
    p.closed = p.closed.map(section => section.filter(c => c !== card)).filter(section => section.length > 0);
    p.validity = p.closed.map(section => rules.testSection(section, this.round));
    this.roundState.pile.unshift(card);
    this.roundState.index++;

    if (!this.checkIfFinished(playerRoundIndex)) {
      this.nextPlayerInTurn();
      this.roundState.phase = this.PICK_CARD;
    };

    this.notifyConnectors(true);
  }

  open(playerRoundIndex, selectedIndices) {
    console.log('open', playerRoundIndex, selectedIndices);
    if (playerRoundIndex !== this.roundState.playerInTurn || this.roundState.phase !== this.TURN_ACTIVE) return false;
    if (!this.validateSelected(playerRoundIndex, selectedIndices).valid) return false;

    let p = this.roundState.players[playerRoundIndex];
    selectedIndices.sort().reverse();
    selectedIndices.forEach(ind => {
      p.closed.splice(ind, 1);
      let validity = p.validity.splice(ind, 1)[0]
      p.open.unshift({cards: validity.data.cards, accepts: validity.data.accepts});
    });
    p.opened = true;
    this.roundState.index++;
    this.checkIfFinished(playerRoundIndex);
    this.notifyConnectors(true);
  }

  complete(playerRoundIndex, handPlayer, handIndex, cardId, dropIndex) {
    console.log('complete', playerRoundIndex, handPlayer, handIndex, cardId, dropIndex);
    if (playerRoundIndex !== this.roundState.playerInTurn || this.roundState.phase !== this.TURN_ACTIVE || !this.roundState.players[playerRoundIndex].opened) return false;

    let p = this.roundState.players[playerRoundIndex];
    let playersCards = p.closed.flat();
    let cardIds = playersCards.map(card => card.i);
    if (cardIds.indexOf(cardId) < 0) return false;

    let card = playersCards.filter(c => c.i === cardId)[0];
    let newSections = p.closed.map(section => section.filter(c => c.i !== cardId)).filter(section => section.length > 0);

    let hand = this.roundState.players[handPlayer].open[handIndex];

    let accepts = hand.accepts.filter(acc => acc.r === card.r && (!acc.s || acc.s === card.s));
    let accept = null;
    if (accepts.length === 0) return false;
    if (accepts.length === 2) {
      accept = (Math.abs(accepts[0].ind - dropIndex) < Math.abs(accepts[1].ind - dropIndex)) ? accepts[0] : accepts[1];
    } else {
      accept = accepts[0];
    }

    let joker = hand.cards.splice(accept.ind, accept.replace ? 1 : 0, card);

    if (accept.replace && joker.length === 1) {
      newSections[0].unshift(joker[0]);
    }

    hand.accepts = rules.testSection(hand.cards, this.round).data.accepts;

    p.closed = newSections;
    p.validity = newSections.map(section => rules.testSection(section, this.round));
    this.roundState.index++;
    this.checkIfFinished(playerRoundIndex);
    this.notifyConnectors(true);
    return true;
  }

  nextPlayerInTurn() {
    this.roundState.playerInTurn = ( this.roundState.playerInTurn + 1 ) % this.roundState.players.length;
    this.roundState.players.forEach((p, i) => p.inTurn = i === this.roundState.playerInTurn);
    this.roundState.turnIndex++;
  } 

  checkIfFinished(playerRoundIndex) {
    console.log('checkIfFinished', playerRoundIndex);
    if (this.roundState.players[playerRoundIndex].closed.flat().length === 0) {
      this.roundState.phase = this.ROUND_ENDED;
      this.roundState.winner = playerRoundIndex;
      this.calculateScores();
      return true;
    }
    return false;
  }

  calculateScores() {
    let playerScores = [];
    this.roundState.players.forEach(p => {
      p.score = rules.calculateScore(p.closed);
      playerScores.push(p.score);
    });

    this.game.scoreBoard = this.game.scoreBoard || {rounds:[], total: []};
    this.game.scoreBoard.rounds.push({round: {roundNumber: this.round.roundNumber, roundName: this.round.roundName}, scores: playerScores});
    this.game.scoreBoard.total = 
      this.game.scoreBoard.rounds.reduce((acc, round) => 
        acc.map((s,i) => s + round.scores[i]),
        playerScores.map(p => 0));

    console.log(this.game.scoreBoard);

    this.notifyGameUpdated(true);
  }

  checkDeck() {
    if (this.roundState.deck.length === 0) {
      let newDeck = this.roundState.pile.splice(0,this.roundState.pile.length - 1);
      utils.shuffle(newDeck);
      this.roundState.deck = newDeck;
    }
  }

  previousPlayer(playerRoundIndex) {
    return (playerRoundIndex + this.roundState.players.length - 1) % this.roundState.players.length;
  }

// ---------------------

  validateSelection = (playerRoundIndex, args, callback) => {
    console.log('validateSelection', playerRoundIndex, args);
    let result = this.validateSelected(playerRoundIndex, args.selectedIndices);
    if (callback) callback(result);
    return result;
  } 

  validateSelected = (playerRoundIndex, selectedIndices) => {
    console.log('validateSelected', playerRoundIndex, selectedIndices);

    let selected = selectedIndices.map(i => this.roundState.players[playerRoundIndex].validity[i]);

    return rules.validateOpening(selected, this.roundState.players[playerRoundIndex].closed, this.round);
  }

}

module.exports = {
  ServerState: ServerState,
  getGame: async (io, token) => {
    if (gamestates[token]) {
      return gamestates[token];
    } else {
      let ss = new ServerState(io, token);
      await ss.init();
      gamestates[token] = ss;
      return ss;
    }
  }
};
