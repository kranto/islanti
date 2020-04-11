import * as $ from 'jquery';
import 'jquery-ui-bundle';
import 'jquery-ui-bundle/jquery-ui.css';
import cards from './cards.js';
// import Popper from 'popper.js';
import 'bootstrap/dist/js/bootstrap.bundle.min';


window.jQuery = $;
require('jquery-ui-touch-punch');

var game = (function() {

var round = {
	roundNumber: 1,
	roundName: "kolmoset ja suora",
	expectedSets: 1,
	expectedStraights: 1,	
	isFreestyle: false
};

var OPEN_CARD = "OPEN_CARD";
var PICK_CARD = "PICK_CARD";
var TURN_ACTIVE = "TURN_ACTIVE";
var OPENING = "OPENING";

var dealt = false;
var myTurn = false;
var opened = false;
var state = "";

var allCards = [];


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

function moveOther(index, from, to) {
	let hand = otherHands[index];
	hand[from].pullUp();
	let order = hand.map(c => c.i);
	order.splice(to, 0, order.splice(from, 1)[0]);
	orderOther(index, order);
}

function orderOther(index, newOrder) {
	let hand = otherHands[index];
	hand.sort((a, b) => newOrder.indexOf(a.id) < newOrder.indexOf(b.id) ? -1 : 1);
	hand.render();
}

function pickFromDeck(index) {
	addToOther(index, deck.topCard().id);
}

function pickFromPile(index) {
	addToOther(index, discardPile.topCard().id);
}

function addToOther(index, card) {
	let hand = otherHands[index];
	hand.addCard(allCards.filter(c => c.id === card)[0]);
	hand.render();
}

// function showCard(card) {
// 	let c = allCards[card.i];
// 	c.reveal(card.s, card.r);
// 	discardPile.addCard(c);
// 	discardPile.render();
// }

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
			newOrder();
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
		if (openHand.length === 0) {
			openHands.splice(i, 1);
			openHand.element.remove();
			openHand.element.popover('dispose');
			return;
		}
	}
}

function deal(iStart) {
	deck.deal(13, otherHands.concat([openHands[0]]), 50, function() {
		dealt = true;
		setState(iStart, OPEN_CARD);
	});
}

function setState(_myTurn, _state) {
	myTurn = _myTurn;
	state = _state;

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
	var sets = [];
	var straights = [];
	for (let i = 0; i < selected.length; i++) {
		var hand = selected[i];

		if (!hand.validity.valid) {
			return {valid: false, msg: "Joku valituista sarjoista ei ole sallittu."};
		}
		if (hand.validity.type === 'straight') {
			straights.push(hand.validity.data);
		}
		if (hand.validity.type === 'set') {
			sets.push(hand.validity.data);
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
		if (straightsSuites.indexOf(straights[i].suit) >= 0) {
			return {valid: false, msg: "Suorat täytyy olla eri maista"};
		}
	}

	return {valid: true};
}

function validateHands() {
	openHands.forEach((hand) => {
		hand.validity = validateHand(hand, round.expectedStraights > 0, round.expectedSets > 0);
	});
}

function validateHand(hand, testForStraight, testForSets) {
	var straight = testForStraight ? testStraight(hand) : false;
	var set = testForSets ? testSet(hand) : false;

	if (straight && straight.valid) return {type: 'straight', valid: true, msg: 'Suora', data: straight};
	if (set && set.valid) return {type: 'set', valid: true, msg: 'Kolmoset', data: set};
	return {valid: false, type: false, msg: (straight ? (straight.msg + ". "): "") + (set ? (set.msg + ".") : "")};
}

function testStraight(hand) {
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
		type: 'straight',
		valid: true,
		suit: others[0].suit,
		cards: hand,
		highAce: highAce
	};
}

function testSet(hand) {
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
		type: 'sets',
		valid: true,
		rank: others[0].rank,
		cards: hand,
	};
}

function findCard(servercard) {
	let card = allCards.filter(c => c.id === servercard.i)[0];
	if (!card) {
		card = new cards.Card(servercard.s, servercard.r, servercard.b, servercard.i, ".CardTable");
		allCards.push(card);
	}
	card.reveal(servercard.s, servercard.r, servercard.b);
	return card;
}

function updateContainer(container, servercards) {
	let cards = servercards.map(servercard => findCard(servercard));
	cards.forEach(card => {if (card.container) card.container.removeCard(card); });
	cards.forEach(card => container.addCard(card));
	container.render();
}

function populateState(state) {
	updateContainer(deck, state.deck);
	updateContainer(discardPile, state.pile);
	state.players.forEach((p, i) => updateContainer(otherHands[i], p.closed));

	openHands.forEach(hand => {hand.element.remove(); hand.element.popover('dispose'); });
	openHands = [];

	state.myhands.closed.forEach((c, i) => {
		while (openHands.length - 1 < i) {
			openHands.push(createNewOpenHand());
		}
		let hand = openHands[i];
		updateContainer(hand, c);
	});
}

function sendAction(action, params) {
	socket.emit('action', {...params, action: action});
}

function newOrder() {
	let newOrder = openHands.map(hand => hand.map(card => card.id));
	sendAction('newOrder', {order: newOrder});
}

function stateChange(params) {
	console.log(params);
	switch (params.action) {
		case 'init': case 'fullState':
			populateState(params.state);
			break;
		default:
			break;
	}
}

var socket;

function init(_socket) {
	console.log('game.init');
	socket = _socket;

	$(".CardTable").disableSelection();

	cards.init();

	$(window).resize(function(){
		cards.refresh();
	});

	deck = new cards.Deck({element: $("#deck")}); 

	for (var i = 1; i <= 3; i++) {
		var hand = new cards.Hand({faceUp:false, element: $("#hand" + i)});
		otherHands.push(hand);
	}
	
	discardPile = new cards.Deck({faceUp:true, element: $("#pile"),
	canDrop: function(card) {
		return myTurn && state === TURN_ACTIVE;
	},
	drop: function(card) {
		this.addCard(card);
		removeEmptyOpenHands();
		cards.refresh();
		setState(false, "");
	},
	});

	// deck.click(function(card){	
	// 	if (card === deck.topCard() && myTurn) {
	// 		if (state === OPEN_CARD) {
	// 			discardPile.addCard(deck.topCard());
	// 			discardPile.render();
	// 			setState(true, PICK_CARD);	
	// 		} else if (state === PICK_CARD) {
	// 			setState(true, TURN_ACTIVE);
	// 			openHands[0].addCard(card);
	// 			openHands[0].render();
	// 			cards.refresh();
	// 		}
	// 	}
	// });
	
	discardPile.click(function(card){
		if (card === discardPile.topCard() && myTurn && state === PICK_CARD) {
			setState(true, TURN_ACTIVE);
			openHands[0].addCard(card);
			openHands[0].render();
			cards.refresh();
		}
	});

	$("#newopen").droppable({
		accept: ".playingcard",
		greedy: true,
		drop: function(event, ui) {
			var card = ui.draggable.data('card');
			var openHand = createNewOpenHand();
			openHand.addCard(card, true);
			openHands.push(openHand);
			removeEmptyOpenHands();
			cards.refresh();
			newOrder();
		}
	});
		
	$(".CardTable").droppable({
		accept: ".playingcard",
		drop: function(event, ui) {
			var card = ui.draggable.data('card');
			card.container.render();
		}
	});
	
	$("#openButton").click(() => {
		validateHands();
		setState(true, OPENING);
		updateConfirmButton();
	});
	
	$("#cancelOpenButton").click(function() {
		$(".open-hand").toggleClass("selected", false);
		$(".open-hand").popover('hide');
		updateConfirmButton();
		setState(true, TURN_ACTIVE);
	});
	
	$("#confirmOpenButton").click(function() {
		var selected = [];
		$(".open-hand.selected").each(function() {
			selected.push($(this).data('container'));
		});
	
		$(".open-hand").toggleClass("selected", false);
		$(".open-hand").popover('hide');
	
		alert("Avasit!");
	
		setState(true, TURN_ACTIVE);
	});
	
	$("#selectseries").popover({
		container: '.CardTable',
		placement: 'top',
		trigger: 'manual',
		content: () => validity.msg
	});		

	$("#pile").droppable({
		accept: ".playingcard",
		greedy: true,
		drop: function(event, ui) {
			var card = ui.draggable.data('card');
			if (!myTurn || state !== TURN_ACTIVE) { card.container.render(); return; };
			discardPile.addCard(card);
			removeEmptyOpenHands();
			cards.refresh();
			setState(false, "");
		}
	});
	
	setState(false, "");
}

return {
	init: init,
	deal: deal,
	otherShowCard: () => {
		discardPile.addCard(deck.topCard());
		discardPile.render();
		setState(false, PICK_CARD);
	},
	takeTurn: () => {
		if (!myTurn) {
			setState(true, PICK_CARD);	
		}		
	},
	moveOther: moveOther,
	orderOther: orderOther,
	pickFromDeck: pickFromDeck,
	pickFromPile: pickFromPile,
	addToOther: addToOther,

	stateChange: stateChange
};

})();

export default game;