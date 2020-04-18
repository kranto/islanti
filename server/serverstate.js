const fs = require('fs');

const EventEmitter = require('events');
const StorageDir = '/Users/kranto/tmp';

anonymise = (cards) => cards.map(card => ({...card, s:undefined, r:undefined}));

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
    this.socket = socket;

    this.socket.on('action', args => {
      console.log('connector.onAction', this.index, args);
      this.serverstate.onAction(this.index, args);
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
        state.players = [...state.players.slice(this.index, state.players.length), ...state.players.slice(0,this.index)];
        state.playerInTurn = this.rollIndex(state.playerInTurn, state);
        state.buying = this.rollIndex(state.buying, state);
        state.winner = this.rollIndex(state.winner, state);
        state.myhands = state.players.splice(0, 1)[0];  // --- create myhands, remove from players ---
        state.myTurn = state.playerInTurn < 0;
        state.players = state.players.map(p => ({...p, validity: undefined, 
          closed: p.closed ? (state.phase < 5 ? anonymise(p.closed.flat()) : p.closed.flat()) : []}));
        state.can = {
          deal: state.phase === this.serverstate.DEAL && state.myTurn,
          show: state.phase === this.serverstate.SHOW_CARD && state.myTurn,
          pick: (state.phase === this.serverstate.PICK_CARD || state.phase === this.serverstate.PICK_CARD_BOUGHT) && state.myTurn,
          buy: state.phase === this.serverstate.PICK_CARD && (state.playerInTurn >= 1 || !state.myTurn && state.turnIndex === 1) && state.myhands.bought < 3,
          sell: state.phase === this.serverstate.PICK_CARD_BUYING && state.myTurn,
          open: state.phase === this.serverstate.TURN_ACTIVE && state.myTurn && !state.myhands.opened,
          complete: state.phase === this.serverstate.TURN_ACTIVE && state.myTurn && state.myhands.opened,
          discard: state.phase === this.serverstate.TURN_ACTIVE && state.myTurn,
        }
        change = {...change, state: state};
        break;
    }
    this.socket.emit('stateChange', change);
  }

  rollIndex(player, state) {
    return player === null ? null : (((player + state.players.length - this.index) % state.players.length) - 1);
  }

}

class ServerState {

  DEAL = 1;
  SHOW_CARD = 2;
  PICK_CARD = 3;
  PICK_CARD_BUYING = 3.1;
  PICK_CARD_BOUGHT = 3.2;
  TURN_ACTIVE = 4;
  FINISHED = 5;

  constructor(io, gameId) {
    this.gameId = gameId;
    this.io = io.of('/game/' + gameId);

    this.cards = this.createCards();
    this.connectors = [];
    this.state = false;

    this.eventEmitter = new EventEmitter();
  }

  playerNames = ["HessuHopoliini", "Pelle Peloton", "Hupu", "Roope-Setä"];
  playerDealing = this.playerNames.length - 1;

  init() {
    this.cards = this.createCards();
    this.shuffle(this.cards);
    this.cards.forEach((card, index) => card.i = index);
    this.shuffle(this.cards);
    this.playerCount = this.playerNames.length;

    this.state = {
      round: {
        roundNumber: 1,
        roundName: "kolmoset ja suora",
        expectedSets: 1,
        expectedStraights: 1,	
        isFreestyle: false
      },
      index: 0,
      turnIndex: 0,
      playerInTurn: this.playerDealing,
      phase: this.DEAL,
      dealt: false,
      buying: null,
      deck: [...this.cards],
      pile: [],
      players: [...Array(this.playerCount).keys()].map((i) => ({
        id: i,
        name: this.playerNames[i],
        closed: [[]],
        validity: [{}],
        open: [],
        opened: false,
        inTurn: this.playerDealing === i, 
        bought: 0
      }))
    };

    if (fs.existsSync(StorageDir + '/islantistate.json')) {
      let rawdata = fs.readFileSync(StorageDir + '/islantistate.json');
      this.state = JSON.parse(rawdata);
    }

    console.log(this.state);

    this.io.on('connection', socket => {
      console.log('someone connected', new Date());
      socket.on('authenticate', (args, callback) => {
        let id = parseInt(args.id);
        console.log(id + ' authenticated', args, callback);
        let connector = new Connector(this, id, socket);
        this.connectors.push(connector);
        if (callback) callback(true);
        this.updateConnected();
        socket.on('disconnect', () => {
          console.log('disconnected', connector.index);
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
  
  notifyConnectors() {
    fs.rename(StorageDir + '/islantistate.json.4', StorageDir + '/islantistate.json.5', () => {
      fs.rename(StorageDir + '/islantistate.json.3', StorageDir + '/islantistate.json.4', () => {
        fs.rename(StorageDir + '/islantistate.json.2', StorageDir + '/islantistate.json.3', () => {
          fs.rename(StorageDir + '/islantistate.json.1', StorageDir + '/islantistate.json.2', () => {
            fs.rename(StorageDir + '/islantistate.json', StorageDir + '/islantistate.json.1', () => {

              let data = JSON.stringify(this.state);
              fs.writeFileSync(StorageDir + '/islantistate.json', data);
              this.eventEmitter.emit('stateChange', {action: 'fullState', state: this.getFullState()});
          
            });
          });
        });
      });
    });

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
    return {...this.state, 
      deck: anonymise(this.state.deck), 
      pile: [...this.state.pile.slice(0,2), ...anonymise(this.state.pile.slice(2))]
    };
  }

  deal(player) {
    console.log('deal', player);
    if (player !== this.state.playerInTurn || this.state.phase !== this.DEAL || this.state.dealt) return false;
    this.state.dealt = true;
    [...Array(13).keys()].forEach(() => this.state.players.forEach(p => p.closed[0].push(this.state.deck.shift())));
    // this.state.players.forEach(p => p.open.push({cards: [], accepts: [{r:0, l:-1}, {r:0, l:4}, {r:1, l:-1}, {r:2, l:-1}, {r:3, l:2}, {r:4, l:2}, {r:5, l:4}, {r:6, l:4}, {r:7, l:4}, {r:8, l:4}]}));
    // this.state.players.forEach(p => p.open.push({cards: [], accepts: []}));
    // this.state.players.forEach(p => p.open.push({cards: [], accepts: []}));
    // [...Array(4).keys()].forEach(() => this.state.players.forEach(p => p.open[0].cards.push(this.state.deck.shift())));
    // [...Array(4).keys()].forEach(() => this.state.players.forEach(p => p.open[1].cards.push(this.state.deck.shift())));
    // [...Array(4).keys()].forEach(() => this.state.players.forEach(p => p.open[2].cards.push(this.state.deck.shift())));
    this.nextPlayerInTurn();
    this.state.phase = this.SHOW_CARD;
    this.state.index++;
    this.notifyConnectors();
    return true;
  }

  newOrder(player, order) {
    console.log('newOrder', player, order);
    if (this.phase < this.SHOW_CARD || this.phase >= this.FINISHED) return false;
    let playersCards = this.state.players[player].closed.flat();
    let cardIds = playersCards.map(card => card.i);
    let cardsById = playersCards.reduce((acc, card) => ({...acc, [card.i]: card}), {});
    if ([...cardIds].sort().join(',') !== [...order.flat()].sort().join(',')) {
      console.log('different cards.')
      return false;
    }

    let newSections = order.map(section => section.map(id => cardsById[id]));

    this.state.players[player].closed = newSections;
    this.state.players[player].validity = newSections.map(section => 
      this.testSection(section, this.state.round.expectedStraights > 0, this.state.round.expectedSets > 0));
    this.state.index++;
    this.notifyConnectors();
    return true;
  }

  showCard(player) {
    console.log('showCard', player);
    if (player !== this.state.playerInTurn || this.state.phase !== this.SHOW_CARD) return false;
    this.state.pile.unshift(this.state.deck.shift());
    this.state.phase = this.PICK_CARD;
    this.state.index++;
    this.notifyConnectors();
  }

  pickCard(player, fromDeck) {
    console.log('pickCard', player, fromDeck);
    if (player !== this.state.playerInTurn || (this.state.phase !== this.PICK_CARD && this.state.phase !== this.PICK_CARD_BOUGHT)) return false;
    let card = fromDeck ? this.state.deck.shift() : this.state.pile.shift();
    this.checkDeck();
    this.state.players[player].closed[0].unshift(card);
    this.state.players[player].validity[0] = 
      this.testSection(this.state.players[player].closed[0], this.state.round.expectedStraights > 0, this.state.round.expectedSets > 0);

    this.state.phase = this.TURN_ACTIVE;
    this.state.index++;
    this.notifyConnectors();
  }

  requestToBuy(player) {
    console.log('requestToBuy', player);
    if (player === this.state.playerInTurn || this.state.phase !== this.PICK_CARD || 
      (this.turnIndex > 1 && player === this.previousPlayer(this.state.playerInTurn))) return false;
    this.state.phase = this.PICK_CARD_BUYING;
    this.state.buying = player;
    this.state.index++;
    this.notifyConnectors();
  }

  sell(player) {
    console.log('sell', player);
    if (player !== this.state.playerInTurn || this.state.phase !== this.PICK_CARD_BUYING) return false;
    this.state.players[this.state.buying].closed[0].unshift(this.state.pile.shift());
    this.state.players[this.state.buying].closed[0].unshift(this.state.deck.shift());
    this.state.players[this.state.buying].validity[0] = 
      this.testSection(this.state.players[this.state.buying].closed[0], this.state.round.expectedStraights > 0, this.state.round.expectedSets > 0);
    this.checkDeck();
    this.state.players[this.state.buying].bought++;
    this.state.buying = null;
    this.state.phase = this.PICK_CARD_BOUGHT;
    this.state.index++;
    this.notifyConnectors();
  }

  dontsell(player) {
    console.log('sell', player);
    if (player !== this.state.playerInTurn || this.state.phase !== this.PICK_CARD_BUYING) return false;
    this.state.players[player].closed[0].unshift(this.state.pile.shift());
    this.state.players[player].validity[0] = 
      this.testSection(this.state.players[player].closed[0], this.state.round.expectedStraights > 0, this.state.round.expectedSets > 0);
    this.state.buying = null;
    this.state.phase = this.TURN_ACTIVE;
    this.state.index++;
    this.notifyConnectors();
  }

  discarded(player, id) {
    console.log('discarded', player, id);
    if (player !== this.state.playerInTurn || this.state.phase !== this.TURN_ACTIVE) return false;
    let p = this.state.players[player];
    let matchingCards = p.closed.flat().filter(c => c.i === id);
    if (matchingCards.length !== 1) return; // not found
    let card = matchingCards[0];
    p.closed = p.closed.map(section => section.filter(c => c !== card)).filter(section => section.length > 0);
    p.validity = p.closed.map(section => 
      this.testSection(section, this.state.round.expectedStraights > 0, this.state.round.expectedSets > 0));
    this.state.pile.unshift(card);
    this.state.index++;

    if (!this.checkIfFinished(player)) {
      this.nextPlayerInTurn();
      this.state.phase = this.PICK_CARD;
    };

    this.notifyConnectors();
  }

  open(player, selectedIndices) {
    console.log('open', player, selectedIndices);
    if (player !== this.state.playerInTurn || this.state.phase !== this.TURN_ACTIVE) return false;
    if (!this.validateSelected(player, selectedIndices).valid) return false;

    let p = this.state.players[player];
    selectedIndices.sort().reverse();
    selectedIndices.forEach(ind => {
      p.closed.splice(ind, 1);
      let validity = p.validity.splice(ind, 1)[0]
      p.open.unshift({cards: validity.data.cards, accepts: validity.data.accepts});
    });
    console.log(p.open, p.closed);
    p.opened = true;
    this.state.index++;
    this.checkIfFinished(player);
    this.notifyConnectors();
  }

  complete(player, handPlayer, handIndex, cardId, dropIndex) {
    console.log('complete', player, handPlayer, handIndex, cardId, dropIndex);
    if (player !== this.state.playerInTurn || this.state.phase !== this.TURN_ACTIVE || !this.state.players[player].opened) return false;

    console.log('completing');

    let p = this.state.players[player];
    let playersCards = p.closed.flat();
    let cardIds = playersCards.map(card => card.i);
    if (cardIds.indexOf(cardId) < 0) return false;

    let card = playersCards.filter(c => c.i === cardId)[0];
    let newSections = p.closed.map(section => section.filter(c => c.i !== cardId)).filter(section => section.length > 0);

    let hand = this.state.players[handPlayer].open[handIndex];

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

    hand.accepts = this.testSection(hand.cards, this.state.round.expectedStraights > 0, this.state.round.expectedSets > 0).data.accepts;

    p.closed = newSections;
    p.validity = newSections.map(section => 
      this.testSection(section, this.state.round.expectedStraights > 0, this.state.round.expectedSets > 0));
    this.state.index++;
    this.checkIfFinished(player);
    this.notifyConnectors();
    return true;
  }

  nextPlayerInTurn() {
    this.state.playerInTurn = ( this.state.playerInTurn + 1 ) % this.state.players.length;
    this.state.players.forEach((p, i) => p.inTurn = i === this.state.playerInTurn);
    this.state.turnIndex++;
  }

  checkIfFinished(player) {
    console.log('checkIfFinished', player);
    if (this.state.players[player].closed.flat().length === 0) {
      this.state.phase = this.FINISHED;
      this.state.winner = player;
      return true;
    }
    return false;
  }


  checkDeck() {
    if (this.state.deck.length === 0) {
      let newDeck = this.state.pile.splice(0,this.state.pile.length - 1);
      this.shuffle(newDeck);
      this.state.deck = newDeck;
    }
  }

  previousPlayer(playerIndex) {
    return (playerIndex + this.state.players.length - 1) % this.state.players.length;
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
    let round = this.state.round;

    let selected = selectedIndices.map(i => this.state.players[player].validity[i]);

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
      if (setsNumbers.indexOf(sets[i].number) >= 0) {
        return {valid: false, msg: "Kaikki kolmossarjat täytyy olla eri numeroa"};
      }
    }
    var straightsSuites = [];
    for (let i = 0; i < straights.length; i++) {
      if (straightsSuites.indexOf(straights[i].s) >= 0) {
        return {valid: false, msg: "Suorat täytyy olla eri maista"};
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
  Card: Card
};
