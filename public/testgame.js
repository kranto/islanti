
//Tell the library which element to use for the table
cards.init({table:'#card-table', redJoker: true, blackJoker: true});

$(window).resize(function(){
	cards.refresh();
});

var dealt = false;
var myTurn = false;
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

var myhand = new cards.Hand({faceUp:true, y:540, minWidth: 250,
	isDraggable: function() {
		return true;
	},
	element: $("#myhand"),
});

$("#myhand").droppable({
	accept: ".card",
	greedy: true,
	drop: function(event, ui) {
		var card = ui.draggable.data('card');
		myhand.addCard(card, true);
		removeEmptyOpenHands();
		cards.refresh();
	}
});

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
		minWidth: 100,
		isDraggable: function(card) {
			return true;
		}
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
		return myTurn && state === "TURN_ACTIVE";
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
		if (!myTurn || state !== "TURN_ACTIVE") { card.container.render(); return; };
		discardPile.addCard(card);
		removeEmptyOpenHands();
		cards.refresh();
		setState(false, "");
	}
});

deck.click(function(card){
	if (card === deck.topCard() && myTurn && state === "PICK_CARD") {
		setState(true, "TURN_ACTIVE");
		myhand.addCard(card);
		myhand.render();
		cards.refresh();
	}
});

discardPile.click(function(card){
	if (card === discardPile.topCard() && myTurn && state === "PICK_CARD") {
		setState(true, "TURN_ACTIVE");
		myhand.addCard(card);
		myhand.render();
		cards.refresh();
	}
});

$('#deal').click(function() {
	//Deck has a built in method to deal to hands.
	$('#deal').prop( "disabled", true );

	deck.deal(13, [myhand].concat(otherHands), 50, function() {
		dealt = true;
		discardPile.addCard(deck.topCard());
		discardPile.render();
		setState(true, "PICK_CARD");
	});
});

$('#myturn').click(function() {
	if (!myTurn) {
		setState(true, "PICK_CARD");	
	}
});

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

	$('#deal').prop( "disabled", dealt);
	$('#myturn').prop( "disabled", !dealt || myTurn);

	$("#pile").droppable({disabled: !myTurn || state !== "TURN_ACTIVE" })
}

setState(false, "");
