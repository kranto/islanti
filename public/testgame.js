
//Tell the library which element to use for the table
cards.init({table:'#card-table', redJoker: true, blackJoker: true});

$(window).resize(function(){
	cards.refresh();
});

var round = {
	roundNumber: 1,
	roundName: "kolmoset ja suora",
	expectedThrees: 1,
	expectedFlushes: 1,	
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

$("#card-table").disableSelection();

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

var deck = new cards.Deck({element: $("#deck")}); 
deck.addCards(cards.all); 
deck.render({immediate:true});

var otherHands = [];
for (var i = 1; i <= 3; i++) {
	var hand = new cards.Hand({faceUp:false, element: $("#hand" + i)});
	otherHands.push(hand);
}

var openHands = [];

openHands.push(createNewOpenHand());

var newOpen = new cards.Hand({
	faceUp:true,
	element: $("#newopen")
});

$("#newopen").droppable({
	accept: ".card",
	greedy: true,
	drop: function(event, ui) {
		var card = ui.draggable.data('card');
		var openHand = createNewOpenHand();
		openHand.addCard(card, true);
		openHands.push(openHand);
		removeEmptyOpenHands();
		cards.refresh();
	}
});

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
		accept: ".card",
		greedy: true,
		drop: function(event, ui) {
			var card = ui.draggable.data('card');
			hand.addCard(card, true);
			removeEmptyOpenHands();
			cards.refresh();
		}
	});
	el.click(openHandClicked);
	return hand;
}

function removeEmptyOpenHands() {
	for (var i = 0; i < openHands.length; i++) {
		var openHand = openHands[i];
		if (openHand.length == 0) {
			openHands.splice(i, 1);
			openHand.element.remove();
			return;
		}
	}
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

$("#pile").droppable({
	accept: ".card",
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

deck.click(function(card){	
	if (card === deck.topCard() && myTurn) {
		if (state === OPEN_CARD) {
			discardPile.addCard(deck.topCard());
			discardPile.render();
			setState(true, PICK_CARD);	
		} else if (state === PICK_CARD) {
			setState(true, TURN_ACTIVE);
			openHands[0].addCard(card);
			openHands[0].render();
			cards.refresh();
		}
	}
});

discardPile.click(function(card){
	if (card === discardPile.topCard() && myTurn && state === PICK_CARD) {
		setState(true, TURN_ACTIVE);
		openHands[0].addCard(card);
		openHands[0].render();
		cards.refresh();
	}
});

$('.deal-button').click(function() {
	$('.deal-button').prop( "disabled", true );

	var iStart = $(this).data("myturn");

	deck.deal(13, [openHands[0]].concat(otherHands), 50, function() {
		dealt = true;
		setState(iStart, OPEN_CARD);
	});
});

$('#othershowcard').click(function() {
	discardPile.addCard(deck.topCard());
	discardPile.render();
	setState(false, PICK_CARD);
});

$('#myturn').click(function() {
	if (!myTurn) {
		setState(true, PICK_CARD);	
	}
});

$("#simulateothers").click(simulateOthers);

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

$("#card-table").droppable({
	accept: ".card",
	drop: function(event, ui) {
		var card = ui.draggable.data('card');
		card.container.render();
	}
});

function setState(_myTurn, _state) {
	myTurn = _myTurn;
	state = _state;

	$('#startover').prop( "disabled", !dealt);
	$('.deal-button').prop( "disabled", dealt);
	$('#othershowcard').prop( "disabled", myTurn || state !== OPEN_CARD);
	$('#simulateothers').prop( "disabled", !dealt || myTurn || (state !== "" && state !== PICK_CARD));
	$('#myturn').prop( "disabled", !dealt || myTurn);
	simulateothers
	$("#pile").droppable({disabled: !myTurn || state !== TURN_ACTIVE })

	$("#openButton").css('display', dealt && myTurn && !opened && state === TURN_ACTIVE ? "block": "none");
	$("#confirmOpenButton").css('display', dealt && myTurn && !opened && state === OPENING ? "block": "none");
	$("#cancelOpenButton").css('display', dealt && myTurn && !opened && state === OPENING ? "block": "none");

	$("#opencard_others").css('display', function() {return state === OPEN_CARD && !myTurn? 'block' : 'none'});
	$("#opencard_myturn").css('display', function() {return state === OPEN_CARD && myTurn? 'block' : 'none'});
	$("#pickcard").css('display', function() {return myTurn && state === PICK_CARD ? 'block' : 'none'});
	$("#selectseries").css('display', dealt && myTurn && !opened && state === OPENING ? "block": "none");
	$("#selectseries span").text(round.roundName);

	$(".card").draggable("disable");
	if (state !== OPENING) {
		openHands.forEach(function(hand) {hand.forEach(function(c) {$(c.el).draggable("enable")})});
	}

	$("#card-table").toggleClass('selecting', state === OPENING);
}

$("#openButton").click(function() {setState(true, OPENING);});
$("#cancelOpenButton").click(function() {
	$(".open-hand").toggleClass("selected", false);
	setState(true, TURN_ACTIVE);
});

$("#confirmOpenButton").click(function() {
	var selected = [];
	$(".open-hand.selected").each(function() {
		selected.push($(this).data('container'));
	});

	var myAllCards = openHands.reduce(function(acc, hand) {return acc + hand.length}, 0);

	var result = validateSelected(selected, myAllCards);

	$(".open-hand").toggleClass("selected", false);
	if (!result) {
		setState(true, TURN_ACTIVE);
	}
});

function openHandClicked() {
	$(this).toggleClass("selected");
}

setState(false, "");

// ===========

function validateSelected(selected, cardCount) {
	console.log(selected, cardCount);
	var threes = [];
	var flushes = [];
	for (var i = 0; i < selected.length; i++) {
		var hand = selected[i];
		var flush = testFlush(hand);

		if (flush.valid) {
			flushes.push(flush);
		} else {
			var three = testThree(hand);
			if (three.valid) {
				threes.push(three);
			} else {
				validateError("Joku valituista sarjoista ei ole sallittu. " + flush.msg + ". " + three.msg + ".");
				if (round.expectedFlushes == 0) {
					validateError("Joku valituista sarjoista ei ole sallittu. " + three.msg + ".");
				} else if (round.expectedThrees == 0) {
					validateError("Joku valituista sarjoista ei ole sallittu. " + flush.msg + ".");
				} else {
					validateError("Joku valituista sarjoista ei ole sallittu. " + flush.msg + ". " + three.msg + ".");
				}
				return false;
			}
		}
	}
	if (threes.length !== round.expectedThrees && !round.isFreestyle) {
		validateError("Pitäisi olla " + round.expectedThrees + " kolmoset, mutta onkin " + threes.length);
		return false;
	}
	if (flushes.length !== round.expectedFlushes && !round.isFreestyle) {
		validateError("Pitäisi olla " + round.expectedFlushes + " suoraa, mutta onkin " + flushes.length);
		return false;
	}
	var threesNumbers = [];
	for (var i = 0; i < threes.length; i++) {
		if (threesNumbers.indexOf(threes[i].number) >= 0) {
			validateError("Kahdet kolmoset täytyy olla eri numeroa");
			return false;
		}
	}
	var flushesSuites = [];
	for (var i = 0; i < flushes.length; i++) {
		if (flushesSuites.indexOf(flushes[i].suit) >= 0) {
			validateError("Suorat täytyy olla eri maista");
			return false;
		}
	}

	return true;
}

function testFlush(hand) {
	if (hand.length < 4) {
		return {valid: false, msg: "Suorassa täytyy olla vähintään neljä korttia"};
	}
	if (hand.length > 13) {
		return {valid: false, msg: "Suorassa ei saa olla yli 13 korttia"};
	}

	var others = hand.filter(c => c.rank > 0);
	var jokers = hand.filter(c => c.rank == 0);
	var aces = hand.filter(c => c.rank == 1);

	if (others.filter(c => c.suit != others[0].suit).length > 0) {
		return {valid: false, msg: "Suorassa saa olla vain yhtä maata"};
	}
	if (jokers.length >= others.length) {
		return {valid: false, msg: "Suorassa vähintään puolet korteista pitää olla muita kuin jokereita"}
	}

	var highAce = false;
	if (aces.length > 1) {
		return {valid: false, msg: "Suorassa voi olla vain yksi ässä"};
	} else if (aces.length == 1) {
		if (others[0] === aces[0]) {
			highAce = others[1].rank > 8;
		} else if (others[others.length-1] == aces[0]) {
			highAce = others[others.length-2].rank > 8;
		} else {
			return {valid: false, msg: "Ässän täytyy olla suoran päässä"};
		}
	}

	var ranks = hand.map(c => highAce && c.rank == 1 ? 14 : c.rank);
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
	var jokers = hand.filter(c => c.rank == 0);
	var others = hand.filter(c => c.rank > 0);
	if (jokers.length >= others.length) {
		return {valid: false, msg: "Kolmosissa vähintään puolet korteista pitää olla muita kuin jokereita"}
	}
	if (others.filter(c => c.rank != others[0].rank).length > 0) {
		return {valid: false, msg: "Kolmosissa saa olla vain yhtä numeroa"};
	}

	return {
		type: 'threes',
		valid: true,
		rank: others[0].rank,
		cards: hand,
	};
}

function validateError(msg) {
	alert(msg);
}
