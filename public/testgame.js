
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
var deck = new cards.Deck({boundingElement: $("#deck")}); 
deck.addCards(cards.all); 
deck.render({immediate:true});

var openHands = [];

var otherHands = [];
for (var i = 1; i <= 3; i++) {
	var hand = new cards.Hand({faceUp:false, boundingElement: $("#hand" + i)});
	otherHands.push(hand);
}

var myhand = new cards.Hand({faceUp:true, y:540, minWidth: 250,
	isDraggable: function() {
		return true;
	},
	canDrop: function(card) {
		return true;
	},
	drop: function(card) {
		this.addCard(card, true);
		removeEmptyOpenHands();
		cards.refresh();
	},
	boundingElement: $("#myhand"),

});

var newOpen = new cards.Hand({
	faceUp:true,
	boundingElement: $("#newopen"),
	canDrop: function(card) {
		return true;
	},
	drop: function(card) {
		var el = $("#open-hand-template").clone().removeAttr("id").show();
		el.insertBefore("#newopen");
		var openHand = new cards.Hand({
			faceUp:true, 
			boundingElement: el,
			minWidth: 100,
			canDrop: function(card) {
				return card.container === this || 
					(card.container !== this && this.length < 13);
			},
			drop: function(card) {
				this.addCard(card, true);
				removeEmptyOpenHands();
				cards.refresh();
			},
			isDraggable: function(card) {
				return true;
			}
		});
		openHands.push(openHand);
		openHand.addCard(card, true);
		removeEmptyOpenHands();
		cards.refresh();
	}
});

function removeEmptyOpenHands() {
	for (var i = 0; i < openHands.length; i++) {
		var openHand = openHands[i];
		if (openHand.length == 0) {
			openHands.splice(i, 1);
			openHand.boundingElement.remove();
			return;
		}
	}
}

discardPile = new cards.Deck({faceUp:true, boundingElement: $("#pile"),
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

function setState(_myTurn, _state) {
	myTurn = _myTurn;
	state = _state;

	$('#deal').prop( "disabled", dealt);
	$('#myturn').prop( "disabled", !dealt || myTurn);
}

setState(false, "");
