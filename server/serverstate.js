const EventEmitter = require('events');

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
        state.myhands = state.players.splice(0, 1)[0];
        state.myTurn = state.playerInTurn < 0;
        state.players = state.players.map(p => ({...p, validity: undefined, 
          closed: p.closed ? (state.phase < 5 ? anonymise(p.closed.flat()) : p.closed.flat()) : []}));
        state.can = {
          deal: state.phase === this.serverstate.DEAL && state.myTurn,
          show: state.phase === this.serverstate.SHOW_CARD && state.myTurn,
          pick: (state.phase === this.serverstate.PICK_CARD || state.phase === this.serverstate.PICK_CARD_BOUGHT) && state.myTurn,
          buy: state.phase === this.serverstate.PICK_CARD && (state.playerInTurn >= 1 || !state.myTurn && state.turnIndex === 1) && state.myhands.bought < 3,
          sell: state.phase === this.serverstate.PICK_CARD_BUYING && state.myTurn,
          open: state.phase === this.serverstate.TURN_ACTIVE && state.myTurn && state.myhands.open.length === 0,
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

  playerNames = ["HessuHopoliini", "Pelle Peloton"]; //, "Hupu", "Roope-Setä"];
  playerDealing = this.playerNames.length - 1;

  init() {
    this.cards = this.createCards();
    this.shuffle(this.cards);
    this.cards.forEach((card, index) => card.i = index);
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
        name: this.playerNames[i], 
        closed: [[]],
        validity: [{}],
        open: [],
        opened: false,
        inTurn: this.playerDealing === i, 
        bought: 0
      }))
    };

    console.log(this.state, this.DEAL, this.SHOW_CARD);

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
      }
  }
  
  notifyConnectors() {
    this.eventEmitter.emit('stateChange', {action: 'fullState', state: this.getFullState()});
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
    for (var k in [1, 2, 3]) {
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
    // this.state.players.forEach(p => p.open.push([]));
    // this.state.players.forEach(p => p.open.push([]));
    // this.state.players.forEach(p => p.open.push([]));
    // [...Array(4).keys()].forEach(() => this.state.players.forEach(p => p.open[0].push(this.state.deck.shift())));
    // [...Array(4).keys()].forEach(() => this.state.players.forEach(p => p.open[1].push(this.state.deck.shift())));
    // [...Array(4).keys()].forEach(() => this.state.players.forEach(p => p.open[2].push(this.state.deck.shift())));
    this.nextPlayerInTurn();
    this.state.phase = this.SHOW_CARD;
    this.state.index++;
    this.notifyConnectors();
    return true;
  }

  newOrder(player, order) {
    if (this.phase < this.SHOW_CARD) return false;
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
    selectedIndices.forEach(ind => p.open.unshift(p.closed.splice(ind, 1)[0]));
    console.log(p.open, p.closed);
    p.opened = true;
    this.state.index++;
    this.checkIfFinished(player);
    this.notifyConnectors();
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
  
    var others = section.filter(c => c.r > 0);
    var jokers = section.filter(c => c.r === 0);
    var aces = section.filter(c => c.r === 1);
  
    if (others.filter(c => c.s !== others[0].s).length > 0) {
      return {valid: false, msg: "Suorassa saa olla vain yhtä maata"};
    }
    if (jokers.length >= others.length) {
      return {valid: false, msg: "Suorassa vähintään puolet korteista pitää olla muita kuin jokereita"}
    }
  
    // FIXME this does not work with jokers as aces
    var highAce = false;
    if (aces.length > 1) {
      return {valid: false, msg: "Suorassa voi olla vain yksi ässä"};
    } else if (aces.length === 1) {
      if (others[0] === aces[0]) {
        highAce = others[1].r > 8;
      } else if (others[others.length-1] === aces[0]) {
        highAce = others[others.length-2].r > 8;
      } else {
        return {valid: false, msg: "Ässän täytyy olla suoran päässä"};
      }
    }
  
    var ranks = section.map(c => highAce && c.r === 1 ? 14 : c.r);
    var otherRanks = ranks.filter(r => r > 0);
  
    var increasing = otherRanks[0] < otherRanks[1];
    if (!increasing) {
      section = [...section].reverse();
      others = [...others].reverse();
      jokers = [...jokers].reverse();
      ranks = [...ranks].reverse();
      otherRanks = [...otherRanks].reverse();
    }
  
    var rankStart = otherRanks[0] - ranks.indexOf(otherRanks[0]);
  
    if (rankStart < 1 || rankStart + ranks.length - 1 > 14) {
      return {valid: false, msg: "Suora ei voi mennä kulman ympäri"};
    }
  
    for (var i = 0; i < ranks.length; i++) {
      if (ranks[i] !== 0  && ranks[i] !== rankStart + i) {
        return {valid: false, msg: "Suorassa täytyy olla kortit järjestyksessä"}
      }
    }
  
    return {
      type: 'straight',
      valid: true,
      suit: others[0].s,
      cards: section,
      highAce: highAce
    };
  }
  
  testSet = (hand) => {
    if (hand.length < 3) {
      return {valid: false, msg: "Kolmosissa täytyy olla vähintään kolme korttia"};
    }
    // if (hand.length > 8) {
    //   return {valid: false, msg: "Kolmosissa ei saa olla yli 8 korttia"};
    // }
    var jokers = hand.filter(c => c.r === 0);
    var others = hand.filter(c => c.r > 0);
    if (jokers.length >= others.length) {
      return {valid: false, msg: "Kolmosissa vähintään puolet korteista pitää olla muita kuin jokereita"}
    }
    if (others.filter(c => c.r !== others[0].r).length > 0) {
      return {valid: false, msg: "Kolmosissa saa olla vain yhtä numeroa"};
    }
  
    return {
      type: 'sets',
      valid: true,
      rank: others[0].r,
      cards: hand,
    };
  }
  
}

module.exports = {
  ServerState: ServerState,
  Card: Card
};

  // state = {
  //   round: { index: 1, name: 'Kolmoset ja suora' },
  //   roundStartedBy: 2,
  //   players: [
  //     { name: "Pasi" },
  //     { name: "Inka" },
  //     { name: "Hellevi" },
  //     { name: "Artturi" },
  //   ],
  //   playerHands: [
  //     { closedHand: [[0, 1, 0, 0, 1, 1, 1, 1, 0]], openHands: [{ type: 'set', cards: [10, 10, 10, 12, 12] }, {}] },
  //     { closedHand: [[0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1]], openHands: [{ type: 'straight', cards: [] }, {}] },
  //     { closedHand: [[0, 1, 0, 0, 1, 1, 1, 1, 0, 1, 1]], openHands: [{ type: 'straight', cards: [] }, {}] },
  //   ],
  //   myHands: { closedHand: [[82, 99, 14, 9], [104, 67]], openHands: [{ type: 'straight', cards: [] }, {}] },

  //   deck: { firstCard: 0, count: 44 },
  //   pile: { firstCard: 103, count: 25 },

  //   playerActive: 2,
  //   state: 'pick',
  // }

  // deal(deck, firstPlayer, firstCard, count, playerStartingRound) {}
  // showsFirstCard(card, firstInDeck, deckCount) {}
  // movesCard(player, from, to, newClosedHand) {}
  // picksFromDeck(player, card, firstCard, count) {}
  // picksFromPile(player, card, firstCard, count) {}
  // opens(player, fromArray, openHands) {}
  // abandonsCard(player, from, card, newPlayerInTurn) {}
  // willToBuy(seller, buyers) {} // [{player: 1, time: 123}]
  // sells(seller, buyer, cardInPile, firstCardIPile, pileCount, cardInDeck, firstCardInDeck, deckCount)
  // newDeck(firstCardInDeck, deckCount, firstCardInPile, pileCount)

// moveCard(from, to, closedhand)
// showFirstCard()
// pickFromDeck()
// pickFromPile()
// open(openHands);
// abandonCard(from, card)
// willBuy()
// sell()
// dontSell()

/*
var OPEN_CARD = "OPEN_CARD";
var PICK_CARD = "PICK_CARD";
var TURN_ACTIVE = "TURN_ACTIVE";
var OPENING = "OPENING";

var dealt = false;
var myTurn = false;
var opened = false;
var state = "";


// gameStates/events:
// OTHERS TURN START, OTHER PICKS FROM DECK, OTHER PICKS FROM DISCARD PILE,
// OTHERS_TURN_IDLE,
// OTHER OPENS, OTHER COMPLETES, OTHER DISCARDS A CARD, OTHER_FINISH_TURN, OTHER WINS THE GAME,
// BUYABLE_APPEARS [I CAN/CANNOT BUY], NO-ONE BOUGHT, SOMEONE ELSE WINS, I WIN, OTHER_WONT_SELL
// MY_TURN_STARTS, NOONE BUYS, I DECIDE IF I SELL, I SELL, I DONT SELL,
// I OPEN, I COMPLETE, I PUT CARD AWAY, I WON THE GAME
// I reorder, Other reorder
// Out of cards

//Create a new deck of cards


let deck;
let otherHands = [];
let openHands = [];
let discardPile;


function createNewOpenHand() {
  var el = $("#open-hand-template").clone().removeAttr("id").addClass('hand-section').show();
  el.insertBefore("#newopen");
  var hand = new cards.Hand({
    faceUp:true,
    element: el,
    minWidth: 80,
    isDraggable: true
  });
  el.droppable({
    accept: ".playingcard",
    greedy: true,
    drop: function(event, ui) {
      var card = ui.draggable.data('card');
      hand.addCard(card, true);
      removeEmptyOpenHands();
      cards.refresh();
    }
  });
  el.click(openHandClicked);
  el.popover({
    container: '.CardTable',
    placement: 'top',
    trigger: 'manual',
    content: () => hand.validity.msg
    });
  return hand;
}

function removeEmptyOpenHands() {
  for (var i = 0; i < openHands.length; i++) {
    var openHand = openHands[i];
    if (openHand.length == 0) {
      openHands.splice(i, 1);
      openHand.element.remove();
      openHand.element.popover('dispose');
      return;
    }
  }
}

function deal(iStart) {
  deck.deal(13, [openHands[0]].concat(otherHands), 50, function() {
    dealt = true;
    setState(iStart, OPEN_CARD);
  });
}

function sleep(fromMs, toMs) {
  if (!toMs) toMs = fromMs;
  return new Promise(resolve => setTimeout(resolve, Math.random()*(toMs - fromMs) + fromMs));
  }

async function  simulateOthers() {
  $("simulateothers").prop("disabled", true);
  for (var i in otherHands) {
    await simulateOnePlayer(otherHands[i]);
  }
  setState(true, PICK_CARD);
}

async function simulateOnePlayer(hand) {
  await sleep(500, 2000);
  var card = (Math.random() > 0.7 && discardPile.length > 0) ? discardPile.topCard() : deck.topCard();
  hand.addCard(card);
  cards.refresh();
  setState(false, TURN_ACTIVE);
  await sleep(1000, 2000);
  discardPile.addCard(hand[Math.floor(Math.random()*hand.length)]);
  cards.refresh();
  setState(false, PICK_CARD);
}

function setState(_myTurn, _state) {
  myTurn = _myTurn;
  state = _state;

  $('#startover').prop( "disabled", !dealt);
  // $('.deal-button').prop( "disabled", dealt);
  // $('#othershowcard').prop( "disabled", myTurn || state !== OPEN_CARD);
  // $('#simulateothers').prop( "disabled", !dealt || myTurn || (state !== "" && state !== PICK_CARD));
  // $('#myturn').prop( "disabled", !dealt || myTurn);
  $("#pile").droppable({disabled: !myTurn || state !== TURN_ACTIVE })

  $("#openButton").css('display', dealt && myTurn && !opened && state === TURN_ACTIVE ? "block": "none");
  $("#confirmOpenButton").css('display', dealt && myTurn && !opened && state === OPENING ? "block": "none");
  $("#cancelOpenButton").css('display', dealt && myTurn && !opened && state === OPENING ? "block": "none");

  $("#opencard_others").css('display', function() {return state === OPEN_CARD && !myTurn? 'block' : 'none'});
  $("#opencard_myturn").css('display', function() {return state === OPEN_CARD && myTurn? 'block' : 'none'});
  $("#pickcard").css('display', function() {return myTurn && state === PICK_CARD ? 'block' : 'none'});
  $("#selectseries").css('display', dealt && myTurn && !opened && state === OPENING ? "block": "none");
  $("#selectseries span").text(round.roundName);

  $(".playingcard").draggable("disable");
  if (state !== OPENING) {
    openHands.forEach(function(hand) {hand.forEach(function(c) {$(c.el).draggable("enable")})});
  }

  $(".CardTable").toggleClass('selecting', state === OPENING);
}


function openHandClicked() {
  if ($(this).hasClass("selected")) {
    $(this).toggleClass("selected", false);
    $(this).popover('hide');
  } else {
    $(this).toggleClass("selected", true);
    $(this).toggleClass("error", !$(this).data("container").validity.valid);
    $(this).popover('show');
  }
  updateConfirmButton();
}

function updateConfirmButton() {
  var selected = [];
  $(".open-hand.selected").each(function() {
    selected.push($(this).data('container'));
  });

  var myAllCards = openHands.reduce(function(acc, hand) {return acc + hand.length}, 0);

  validity = validateSelected(selected, myAllCards);
  $("#confirmOpenButton").prop("disabled", !validity.valid);
  showValidityMessage();
}

var validity;
function showValidityMessage() {
  $("#errormsg").text(validity.valid ? "" : validity.msg);
}

// ===========

function validateSelected(selected, cardCount) {
  var threes = [];
  var flushes = [];
  for (var i = 0; i < selected.length; i++) {
    var hand = selected[i];

    if (!hand.validity.valid) {
      return {valid: false, msg: "Joku valituista sarjoista ei ole sallittu."};
    }
    if (hand.validity.type === 'flush') {
      flushes.push(hand.validity.data);
    }
    if (hand.validity.type === 'three') {
      threes.push(hand.validity.data);
    }
  }
  if (threes.length !== round.expectedThrees && !round.isFreestyle) {
    return {valid: false, msg: "Pitäisi olla " + round.expectedThrees + " kolmoset, mutta onkin " + threes.length};
  }
  if (flushes.length !== round.expectedFlushes && !round.isFreestyle) {
    return {valid: false, msg: "Pitäisi olla " + round.expectedFlushes + " suoraa, mutta onkin " + flushes.length};
  }
  var threesNumbers = [];
  for (var i = 0; i < threes.length; i++) {
    if (threesNumbers.indexOf(threes[i].number) >= 0) {
      return {valid: false, msg: "Kaikki kolmossarjat täytyy olla eri numeroa"};
    }
  }
  var flushesSuites = [];
  for (var i = 0; i < flushes.length; i++) {
    if (flushesSuites.indexOf(flushes[i].s) >= 0) {
      return {valid: false, msg: "Suorat täytyy olla eri maista"};
    }
  }

  return {valid: true};
}

function validateHands() {
  openHands.forEach((hand) => {
    hand.validity = validateHand(hand, round.expectedFlushes > 0, round.expectedThrees > 0);
  });
}

function validateHand(hand, testForFlush, testForThrees) {
  var flush = testForFlush ? testFlush(hand) : false;
  var three = testForThrees ? testThree(hand) : false;

  if (flush && flush.valid) return {type: 'flush', valid: true, msg: 'Suora', data: flush};
  if (three && three.valid) return {type: 'three', valid: true, msg: 'Kolmoset', data: three};
  return {valid: false, type: false, msg: (flush ? (flush.msg + ". "): "") + (three ? (three.msg + ".") : "")};
}

function testFlush(hand) {
  if (hand.length < 4) {
    return {valid: false, msg: "Suorassa täytyy olla vähintään neljä korttia"};
  }
  if (hand.length > 13) {
    return {valid: false, msg: "Suorassa ei saa olla yli 13 korttia"};
  }

  var others = hand.filter(c => c.rank > 0);
  var jokers = hand.filter(c => c.rank === 0);
  var aces = hand.filter(c => c.rank === 1);

  if (others.filter(c => c.suit !== others[0].suit).length > 0) {
    return {valid: false, msg: "Suorassa saa olla vain yhtä maata"};
  }
  if (jokers.length >= others.length) {
    return {valid: false, msg: "Suorassa vähintään puolet korteista pitää olla muita kuin jokereita"}
  }

  var highAce = false;
  if (aces.length > 1) {
    return {valid: false, msg: "Suorassa voi olla vain yksi ässä"};
  } else if (aces.length === 1) {
    if (others[0] === aces[0]) {
      highAce = others[1].rank > 8;
    } else if (others[others.length-1] === aces[0]) {
      highAce = others[others.length-2].rank > 8;
    } else {
      return {valid: false, msg: "Ässän täytyy olla suoran päässä"};
    }
  }

  var ranks = hand.map(c => highAce && c.rank === 1 ? 14 : c.rank);
  var otherRanks = ranks.filter(r => r > 0);

  var increasing = otherRanks[0] < otherRanks[1];
  if (!increasing) {
    hand.reverse();
    others.reverse();
    jokers.reverse();
    ranks.reverse();
    otherRanks.reverse();
  }

  var rankStart = otherRanks[0] - ranks.indexOf(otherRanks[0]);

  if (rankStart < 1 || rankStart + ranks.length - 1 > 14) {
    return {valid: false, msg: "Suora ei voi mennä kulman ympäri"};
  }

  for (var i = 0; i < ranks.length; i++) {
    if (ranks[i] !== 0  && ranks[i] !== rankStart + i) {
      return {valid: false, msg: "Suorassa täytyy olla kortit järjestyksessä"}
    }
  }

  return {
    type: 'flush',
    valid: true,
    suit: others[0].suit,
    cards: hand,
    highAce: highAce
  };
}

function testThree(hand) {
  if (hand.length < 3) {
    return {valid: false, msg: "Kolmosissa täytyy olla vähintään kolme korttia"};
  }
  if (hand.length > 8) {
    return {valid: false, msg: "Kolmosissa ei saa olla yli 8 korttia"};
  }
  var jokers = hand.filter(c => c.rank === 0);
  var others = hand.filter(c => c.rank > 0);
  if (jokers.length >= others.length) {
    return {valid: false, msg: "Kolmosissa vähintään puolet korteista pitää olla muita kuin jokereita"}
  }
  if (others.filter(c => c.rank !== others[0].rank).length > 0) {
    return {valid: false, msg: "Kolmosissa saa olla vain yhtä numeroa"};
  }

  return {
    type: 'threes',
    valid: true,
    rank: others[0].rank,
    cards: hand,
  };
}
*/