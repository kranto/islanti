const fs = require('fs');

const storage = require('./storage');

const gamestates = {};

const updateGame = async (game) => {
  console.log('updateGame', game);
  await storage.game().replaceOne({_id: game._id}, game);
};

const findGameByToken = async (token) => {
  return await storage.game().findOne({active: true, token: token});
};

const findRoundState = async (gameToken) => {
  return await storage.roundstate().findOne({'game.token': gameToken}, {sort:{$natural:-1}});
};

const writeRoundState = async (state) => {
  await storage.roundstate().insertOne(state);
};

const EventEmitter = require('events');

const ROUNDS = [
  { roundNumber: 1, roundName: "kolmoset ja suora", expectedSets: 1, expectedStraights: 1,	isFreestyle: false },
  { roundNumber: 2, roundName: "kahdet kolmoset", expectedSets: 2, expectedStraights: 0,	isFreestyle: false },
  { roundNumber: 3, roundName: "kaksi suoraa", expectedSets: 0, expectedStraights: 2,	isFreestyle: false },
  { roundNumber: 4, roundName: "kahdet kolmoset ja suora", expectedSets: 2, expectedStraights: 1,	isFreestyle: false },
  { roundNumber: 5, roundName: "kolmoset ja kaksi suoraa", expectedSets: 1, expectedStraights: 2,	isFreestyle: false },
  { roundNumber: 6, roundName: "kolmet kolmoset", expectedSets: 3, expectedStraights: 0,	isFreestyle: false },
  { roundNumber: 7, roundName: "kolme suoraa", expectedSets: 0, expectedStraights: 3,	isFreestyle: false },
  { roundNumber: 8, roundName: "freestyle", expectedSets: 1, expectedStraights: 1,	isFreestyle: true },
];

anonymise = (cards) => cards ? cards.map(card => ({...card, s:undefined, r:undefined})) : null;

class Card {
  constructor(back, suit, rank) {
    this.b = back;
    this.s = suit;
    this.r = rank;
  }

  toPlayer(faceUp) {
    return faceUp ? {i: this.i, b: this.b, s:this.s, r:this.r} : {i: this.i, b: this.b};
  }
}

class Connector  {
  constructor(serverstate, index, socket) {
    this.serverstate = serverstate;
    this.index = index;
    this.imGuest = this.index === null;
    this.socket = socket;

    this.socket.on('action', args => {
      console.log('connector.onAction', this.index, args);
      this.serverstate.onAction(this.index, args);
    });

    this.socket.on('gameAction', async args => {
      console.log('connector.onGameAction', this.index, args);
      await this.serverstate.onGameAction(this.index, args);
    });

    this.socket.on('validateSelection', (args, callback) => {
      console.log('connector.validateSelection', this.index, args, callback);
      this.serverstate.validateSelection(this.index, args, callback);
    });

    this.socket.on('state', () => this.stateChange({action: 'fullState', state: this.serverstate.getFullState()}));
    this.socket.emit('authenticated');

    this.serverstate.eventEmitter.on('stateChange', this.stateChange);
  }

  removeListeners() {
    console.log('removing listener');
    this.serverstate.eventEmitter.removeListener('stateChange', this.stateChange);
  }

  stateChange = (change) => {
    console.log('connector.stateChange', this.index, change.action);
    switch (change.action) {
      case 'fullState':
        console.log('connector.stateChange.fullState', this.index, change.state.index);
        let state = JSON.parse(JSON.stringify(change.state));

        state.game.imOwner = true;
        if (state.phase > this.serverstate.BEGIN) {
          if (!this.imGuest) state.players = [...state.players.slice(this.index, state.players.length), ...state.players.slice(0,this.index)];
          state.playerInTurn = this.rollIndex(state.playerInTurn, state);
          state.buying = this.rollIndex(state.buying, state);
          state.winner = this.rollIndex(state.winner, state);
          state.myhands = this.imGuest ? null : state.players.splice(0, 1)[0];  // --- create myhands, remove from players ---
          state.myTurn = state.playerInTurn < 0;
          state.players = state.players.map(p => ({...p, validity: undefined, closed: p.closed ? anonymise(p.closed.flat()) : []}));
          state.can = {
            deal: state.phase === this.serverstate.DEAL && state.myTurn,
            show: state.phase === this.serverstate.SHOW_CARD && state.myTurn,
            pick: (state.phase === this.serverstate.PICK_CARD || state.phase === this.serverstate.PICK_CARD_BOUGHT) && state.myTurn,
            buy: !this.imGuest && state.phase === this.serverstate.PICK_CARD && (state.playerInTurn >= 1 || !state.myTurn && state.turnIndex === 1) && state.myhands.bought < 3,
            sell: state.phase === this.serverstate.PICK_CARD_BUYING && state.myTurn,
            open: state.phase === this.serverstate.TURN_ACTIVE && state.myTurn && !state.myhands.opened,
            complete: state.phase === this.serverstate.TURN_ACTIVE && state.myTurn && state.myhands.opened,
            discard: state.phase === this.serverstate.TURN_ACTIVE && state.myTurn,
          };  
        }

        change = {...change, state: state};
        break;
    }
    this.socket.emit('stateChange', change);
  }

  rollIndex(player, state) {
    if (this.imGuest) return player;
    return player === null ? null : (((player + state.players.length - this.index) % state.players.length) - 1);
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
  FINISHED = 5;

  constructor(io, gameToken) {
    this.gameToken = gameToken;
    this.io = io.of('/game/' + gameToken);

    this.connectors = [];
    this.round = false;

    this.eventEmitter = new EventEmitter();
  }

  async init() {
    console.log(this.gameToken + ' initializing');
    // read game from db
    let initialRoundState = {
      index: 0,
      phase: this.BEGIN
    };

    let savedState = await findRoundState(this.gameToken);
    this.round = savedState ? savedState : initialRoundState;

    await this.onGameUpdated();
    console.log('game ' + this.game.token + ' initialized');
    console.log(this.round);

    this.io.on('connection', socket => {
      console.log('someone connected to ' + this.gameToken, new Date());
      socket.on('authenticate', (args, callback) => {
        console.log('authenticate', args);
        console.log(this.game);
        let matching = this.game.players.map((p, i) => ({...p, index: i})).filter(p => p.token === args.participation);
        let player = matching.length === 1 ? matching[0] : null;
        console.log(player.nick + ' authenticated',  args, callback);
        let connector = new Connector(this, player.index, socket);
        this.connectors.push(connector);
        if (callback) callback({authenticated: true, myName: player.nick});
        this.updateConnected();
        socket.on('disconnect', () => {
          console.log(player.nick + ' disconnected', connector.index);
          this.connectors = this.connectors.filter(c => c !== connector);
          connector.removeListeners();
        });
      });
    });
  }

  updateConnected() {

  }

  onAction(index, args) {
    console.log('onAction', index, args);
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
  
  async onGameUpdated() {
    this.game = await findGameByToken(this.gameToken);
    this.round.game = this.game;
    this.notifyConnectors(false);
  }

  async onGameAction(index, args) {
    console.log('onAction', index, args);
    switch (args.action) {
      case 'startGame':
        await this.startGame(index);
        break;
      }
  }

  async startGame(player) {
    console.log('startGame', player, this.game.token, this.round.phase);
    if (/*player !== this.round.game.owner || */this.round.phase !== this.BEGIN) return false;

    this.game = {...this.game, locked: true};
    await updateGame(this.game);

    this.round.game = this.game;

    this.startRound(player, 1, Math.floor(Math.random()*this.game.players.length));
  }

  async notifyConnectors(saveState) {
    console.log(this.round);
    if (saveState) await writeRoundState({...this.round, index: undefined, _id: undefined});
    this.eventEmitter.emit('stateChange', {action: 'fullState', state: this.getFullState()});
  }

  startRound(player, roundNumber, dealerIndex) {
    console.log('startRound', this.game.token, player, roundNumber, dealerIndex);
    this.cards = this.createCards();
    this.shuffle(this.cards);
    this.cards.forEach((card, index) => card.i = index);
    this.shuffle(this.cards);

    let roundIndex = roundNumber - 1;

    this.round = {
      ...this.round,
      round: ROUNDS[roundIndex],
      turnIndex: 0,
      playerInTurn: dealerIndex,
      phase: this.DEAL,
      dealt: false,
      buying: null,
      deck: [...this.cards],
      pile: [],
      players: this.game.players.map((p, i) => ({
        id: i,
        name: p.nick,
        closed: [[]],
        validity: [{}],
        open: [],
        opened: false,
        inTurn: dealerIndex === i, 
        bought: 0
      }))
    };

    this.round.index++;

    this.notifyConnectors(true);
  }

  createCards() {
    return [0, 1].map(back =>
      ['h', 's', 'd', 'c'].map(suit =>
        [...Array(13).keys()].map(rank => new Card(back, suit, rank + 1))).concat([
          new Card(back, 'r', 0), new Card(back, 'b', 0)
        ])
    ).flat(3)
  }

  shuffle(anyArray) {
    for (var k in [1, 2, 3, 4, 5, 6]) {
      var i = anyArray.length;
      while (--i >= 0) {
        var j = Math.floor(Math.random() * anyArray.length);
        var temp = anyArray[i];
        anyArray[i] = anyArray[j];
        anyArray[j] = temp;
      }
    }
  }

  getFullState() {
    console.log(this.round);
    return {...this.round, 
      deck: anonymise(this.round.deck ? this.round.deck : []), 
      pile: this.round.pile ? [...this.round.pile.slice(0,2), ...anonymise(this.round.pile.slice(2)) ] : null
    };
  }

  deal(player) {
    console.log('deal', player);
    if (player !== this.round.playerInTurn || this.round.phase !== this.DEAL || this.round.dealt) return false;
    this.round.dealt = true;
    [...Array(13).keys()].forEach(() => this.round.players.forEach(p => p.closed[0].push(this.round.deck.shift())));
    this.nextPlayerInTurn();
    this.round.phase = this.SHOW_CARD;
    this.round.index++;
    this.notifyConnectors(true);
    return true;
  }

  newOrder(player, order) {
    console.log('newOrder', player, order);
    if (this.phase < this.SHOW_CARD || this.phase >= this.FINISHED) return false;
    let playersCards = this.round.players[player].closed.flat();
    let cardIds = playersCards.map(card => card.i);
    let cardsById = playersCards.reduce((acc, card) => ({...acc, [card.i]: card}), {});
    if ([...cardIds].sort().join(',') !== [...order.flat()].sort().join(',')) {
      console.log('different cards.')
      return false;
    }

    let newSections = order.map(section => section.map(id => cardsById[id]));

    this.round.players[player].closed = newSections;
    this.round.players[player].validity = newSections.map(section => 
      this.testSection(section, this.round.round.expectedStraights > 0, this.round.round.expectedSets > 0));
    this.round.index++;
    this.notifyConnectors(false);
    return true;
  }

  showCard(player) {
    console.log('showCard', player);
    if (player !== this.round.playerInTurn || this.round.phase !== this.SHOW_CARD) return false;
    this.round.pile.unshift(this.round.deck.shift());
    this.round.phase = this.PICK_CARD;
    this.round.index++;
    this.notifyConnectors(true);
  }

  pickCard(player, fromDeck) {
    console.log('pickCard', player, fromDeck);
    if (player !== this.round.playerInTurn || (this.round.phase !== this.PICK_CARD && this.round.phase !== this.PICK_CARD_BOUGHT)) return false;
    let card = fromDeck ? this.round.deck.shift() : this.round.pile.shift();
    this.checkDeck();
    this.round.players[player].closed[0].unshift(card);
    this.round.players[player].validity[0] = 
      this.testSection(this.round.players[player].closed[0], this.round.round.expectedStraights > 0, this.round.round.expectedSets > 0);

    this.round.phase = this.TURN_ACTIVE;
    this.round.index++;
    this.notifyConnectors(true);
  }

  requestToBuy(player) {
    console.log('requestToBuy', player);
    if (player === this.round.playerInTurn || this.round.phase !== this.PICK_CARD || 
      (this.turnIndex > 1 && player === this.previousPlayer(this.round.playerInTurn))) return false;
    this.round.phase = this.PICK_CARD_BUYING;
    this.round.buying = player;
    this.round.index++;
    this.notifyConnectors(true);
  }

  sell(player) {
    console.log('sell', player);
    if (player !== this.round.playerInTurn || this.round.phase !== this.PICK_CARD_BUYING) return false;
    this.round.players[this.round.buying].closed[0].unshift(this.round.pile.shift());
    this.round.players[this.round.buying].closed[0].unshift(this.round.deck.shift());
    this.round.players[this.round.buying].validity[0] = 
      this.testSection(this.round.players[this.round.buying].closed[0], this.round.round.expectedStraights > 0, this.round.round.expectedSets > 0);
    this.checkDeck();
    this.round.players[this.round.buying].bought++;
    this.round.buying = null;
    this.round.phase = this.PICK_CARD_BOUGHT;
    this.round.index++;
    this.notifyConnectors(true);
  }

  dontsell(player) {
    console.log('sell', player);
    if (player !== this.round.playerInTurn || this.round.phase !== this.PICK_CARD_BUYING) return false;
    this.round.players[player].closed[0].unshift(this.round.pile.shift());
    this.round.players[player].validity[0] = 
      this.testSection(this.round.players[player].closed[0], this.round.round.expectedStraights > 0, this.round.round.expectedSets > 0);
    this.round.buying = null;
    this.round.phase = this.TURN_ACTIVE;
    this.round.index++;
    this.notifyConnectors(true);
  }

  discarded(player, id) {
    console.log('discarded', player, id);
    if (player !== this.round.playerInTurn || this.round.phase !== this.TURN_ACTIVE) return false;
    let p = this.round.players[player];
    let matchingCards = p.closed.flat().filter(c => c.i === id);
    if (matchingCards.length !== 1) return; // not found
    let card = matchingCards[0];
    p.closed = p.closed.map(section => section.filter(c => c !== card)).filter(section => section.length > 0);
    p.validity = p.closed.map(section => 
      this.testSection(section, this.round.round.expectedStraights > 0, this.round.round.expectedSets > 0));
    this.round.pile.unshift(card);
    this.round.index++;

    if (!this.checkIfFinished(player)) {
      this.nextPlayerInTurn();
      this.round.phase = this.PICK_CARD;
    };

    this.notifyConnectors(true);
  }

  open(player, selectedIndices) {
    console.log('open', player, selectedIndices);
    if (player !== this.round.playerInTurn || this.round.phase !== this.TURN_ACTIVE) return false;
    if (!this.validateSelected(player, selectedIndices).valid) return false;

    let p = this.round.players[player];
    selectedIndices.sort().reverse();
    selectedIndices.forEach(ind => {
      p.closed.splice(ind, 1);
      let validity = p.validity.splice(ind, 1)[0]
      p.open.unshift({cards: validity.data.cards, accepts: validity.data.accepts});
    });
    console.log(p.open, p.closed);
    p.opened = true;
    this.round.index++;
    this.checkIfFinished(player);
    this.notifyConnectors(true);
  }

  complete(player, handPlayer, handIndex, cardId, dropIndex) {
    console.log('complete', player, handPlayer, handIndex, cardId, dropIndex);
    if (player !== this.round.playerInTurn || this.round.phase !== this.TURN_ACTIVE || !this.round.players[player].opened) return false;

    console.log('completing');

    let p = this.round.players[player];
    let playersCards = p.closed.flat();
    let cardIds = playersCards.map(card => card.i);
    if (cardIds.indexOf(cardId) < 0) return false;

    let card = playersCards.filter(c => c.i === cardId)[0];
    let newSections = p.closed.map(section => section.filter(c => c.i !== cardId)).filter(section => section.length > 0);

    let hand = this.round.players[handPlayer].open[handIndex];

    console.log(hand, card);

    let accepts = hand.accepts.filter(acc => acc.r === card.r && (!acc.s || acc.s === card.s));
    let accept = null;
    console.log(accepts);
    if (accepts.length === 0) return false;
    if (accepts.length === 2) {
      accept = (Math.abs(accepts[0].ind - dropIndex) < Math.abs(accepts[1].ind - dropIndex)) ? accepts[0] : accepts[1];
    } else {
      accept = accepts[0];
    }
    console.log(accept);

    let joker = hand.cards.splice(accept.ind, accept.replace ? 1 : 0, card);
    console.log('joker', joker, hand);

    if (accept.replace && joker.length === 1) {
      newSections[0].unshift(joker[0]);
    }

    hand.accepts = this.testSection(hand.cards, this.round.round.expectedStraights > 0, this.round.round.expectedSets > 0).data.accepts;

    p.closed = newSections;
    p.validity = newSections.map(section => 
      this.testSection(section, this.round.round.expectedStraights > 0, this.round.round.expectedSets > 0));
    this.round.index++;
    this.checkIfFinished(player);
    this.notifyConnectors(true);
    return true;
  }

  nextPlayerInTurn() {
    this.round.playerInTurn = ( this.round.playerInTurn + 1 ) % this.round.players.length;
    this.round.players.forEach((p, i) => p.inTurn = i === this.round.playerInTurn);
    this.round.turnIndex++;
  }

  checkIfFinished(player) {
    console.log('checkIfFinished', player);
    if (this.round.players[player].closed.flat().length === 0) {
      this.round.phase = this.FINISHED;
      this.round.winner = player;
      return true;
    }
    return false;
  }


  checkDeck() {
    if (this.round.deck.length === 0) {
      let newDeck = this.round.pile.splice(0,this.round.pile.length - 1);
      this.shuffle(newDeck);
      this.round.deck = newDeck;
    }
  }

  previousPlayer(playerIndex) {
    return (playerIndex + this.round.players.length - 1) % this.round.players.length;
  }

// ---------------------

  validateSelection = (player, args, callback) => {
    let result = this.validateSelected(player, args.selectedIndices);
    if (callback) callback(result);
    return result;
  } 

  validateSelected = (player, selectedIndices) => {
    var sets = [];
    var straights = [];
    let round = this.round.round;

    let selected = selectedIndices.map(i => this.round.players[player].validity[i]);

    console.log(selected);

    for (let i = 0; i < selected.length; i++) {
      let validity = selected[i];
      if (!validity.valid) {
        return {valid: false, msg: "Joku valituista sarjoista ei ole sallittu."};
      }
      if (validity.type === 'straight') {
        straights.push(validity.data);
      }
      if (validity.type === 'set') {
        sets.push(validity.data);
      }
    }

    if (sets.length !== round.expectedSets && !round.isFreestyle) {
      return {valid: false, msg: "Pitäisi olla " + round.expectedSets + " kolmoset, mutta onkin " + sets.length};
    }
    if (straights.length !== round.expectedStraights && !round.isFreestyle) {
      return {valid: false, msg: "Pitäisi olla " + round.expectedStraights + " suoraa, mutta onkin " + straights.length};
    }

    var setsNumbers = [];
    for (let i = 0; i < sets.length; i++) {
      if (setsNumbers.indexOf(sets[i].rank) >= 0) {
        return {valid: false, msg: "Kaikki kolmossarjat täytyy olla eri numeroa"};
      }
      setsNumbers.push(sets[i].rank);
    }
    var straightSuits = [];
    for (let i = 0; i < straights.length; i++) {
      console.log('straightsuits', straightSuits, straights[i])
      if (straightSuits.indexOf(straights[i].suit) >= 0) {
        return {valid: false, msg: "Suorat täytyy olla eri maista"};
      }
      straightSuits.push(straights[i].suit);
    }
  
    if (round.isFreestyle) {
      let playerCardsCount = this.round.players[player].closed.flat().length;
      let selectedCardsCount = selected.map(validity => validity.data.cards).flat().length;
      console.log(playerCardsCount, selectedCardsCount)
      if (selectedCardsCount < playerCardsCount - 1) {
        return {valid: false, msg: "Freestylessä saa käteen jäädä korkeintaan yksi kortti"};
      }
    }

    return {valid: true};
  }
    
  testSection = (section, testForStraight, testForSets) => {
    console.log('testSection', section, testForStraight, testForSets);
    var straight = testForStraight ? this.testStraight(section) : false;
    var set = testForSets ? this.testSet(section) : false;
  
    console.log(set);
    console.log(straight);

    if (straight && straight.valid) return {type: 'straight', valid: true, msg: 'Suora', data: straight};
    if (set && set.valid) return {type: 'set', valid: true, msg: 'Kolmoset', data: set};

    return {valid: false, type: false, msg: (straight ? (straight.msg + ". "): "") + (set ? (set.msg + ".") : "")};
  }
  
  testStraight = (section) => {
    if (section.length < 4) {
      return {valid: false, msg: "Suorassa täytyy olla vähintään neljä korttia"};
    }
    if (section.length > 13) {
      return {valid: false, msg: "Suorassa ei saa olla yli 13 korttia"};
    }
  
    let others = section.filter(c => c.r > 0);
    let jokers = section.filter(c => c.r === 0);
    let aces = others.filter(c => c.r === 1);
    let suit = others[0].s;

    if (others.filter(c => c.s !== suit).length > 0) {
      return {valid: false, msg: "Suorassa saa olla vain yhtä maata"};
    }
    if (jokers.length >= others.length) {
      return {valid: false, msg: "Suorassa vähintään puolet korteista pitää olla muita kuin jokereita"}
    }
    if (aces.length > 1) {
      return {valid: false, msg: "Suorassa voi olla vain yksi ässä"};
    }

    let ranks = section.map(c => c.r);
    let otherRanks = ranks.filter(r => r > 0);
    let otherRanksThanAces = otherRanks.filter(r => r > 1);

    if (otherRanksThanAces.length < 2) { // this should never occur
      return {valid: false, msg: "Suorassa pitää olla ainakin 2 muuta korttia kuin ässä ja jokeri"};
    }
    
    let increasing = otherRanksThanAces[0] < otherRanksThanAces[1];

    if (!increasing) {
      section = [...section].reverse();
      others = [...others].reverse();
      jokers = [...jokers].reverse();
      ranks = [...ranks].reverse();
      otherRanks = [...otherRanks].reverse();
      otherRanksThanAces = [...otherRanksThanAces].reverse();
    }

    let minRank = otherRanksThanAces[0] - ranks.indexOf(otherRanksThanAces[0]);
    let maxRank = minRank + ranks.length - 1;
    if (minRank < 1 || maxRank > 14) {
      return {valid: false, msg: "Suorassa täytyy olla kortit oikeassa järjestyksessä"};
    }

    let accepts = [];
    let acceptsJoker = jokers.length < others.length - 1;
    if (minRank > 1 && ranks.length < 13) {
      accepts.push({s: suit, r: minRank - 1, ind: 0});
      if (acceptsJoker) {
        accepts.push({r: 0, ind: 0});
      }
    }

    for (var i = 0; i < ranks.length; i++) {
      if (ranks[i] === 0) {
        accepts.push({s: suit, r: minRank + i, ind: i, replace: true})
      } else if (ranks[i] !== minRank + i && (ranks[i] !== 1 || minRank + i !== 14)) {
        return {valid: false, msg: "Suorassa täytyy olla kortit oikeassa järjestyksessä"}
      }
    }

    if (maxRank < 14 && ranks.length < 13) {
      accepts.push({s: suit, r: (maxRank == 13 ? 1 : maxRank + 1), ind: ranks.length});
      if (acceptsJoker) {
        accepts.push({r: 0, ind: ranks.length});
      }
    }
    
    return {
      type: 'straight',
      valid: true,
      suit: suit,
      cards: section,
      minRank: minRank,
      maxRank: maxRank,
      accepts: accepts
    };
  }
  
  testSet = (hand) => {
    if (hand.length < 3) {
      return {valid: false, msg: "Kolmosissa täytyy olla vähintään kolme korttia"};
    }

    var jokers = hand.filter(c => c.r === 0);
    var others = hand.filter(c => c.r > 0);

    if (jokers.length >= others.length) {
      return {valid: false, msg: "Kolmosissa vähintään puolet korteista pitää olla muita kuin jokereita"}
    }

    let rank = others[0].r;
    if (others.filter(c => c.r !== rank).length > 0) {
      return {valid: false, msg: "Kolmosissa saa olla vain yhtä numeroa"};
    }
  
    let accepts = [{r: rank, ind: 0}];
    if (jokers.length < others.length - 1) accepts.push({r: 0, ind: 0});

    return {
      type: 'set',
      valid: true,
      rank: rank,
      cards: hand,
      accepts: accepts
    };
  }
  
}

module.exports = {
  ServerState: ServerState,
  getGame: async (io, token) => {
    if (gamestates[token]) {
      console.log('game found');
      return gamestates[token];
    } else {
      console.log('game not found');
      let ss = new ServerState(io, token);
      await ss.init();
      gamestates[token] = ss;
      return ss;
    }
  }
};
