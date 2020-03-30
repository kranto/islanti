
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
deck = new cards.Deck({boundingElement: $("#deck")}); 
deck.addCards(cards.all); 
deck.render({immediate:true});

hand1 = new cards.Hand({faceUp:false, boundingElement: $("#hand1")});
hand2 = new cards.Hand({faceUp:false, boundingElement: $("#hand2")});
hand3 = new cards.Hand({faceUp:false, boundingElement: $("#hand3")});

myhand = new cards.Hand({faceUp:true, y:540, maxWidth: 400, 
	isDraggable: function() {
		return true;
	},
	canDrop: function(card) {
		return true;
	},
	drop: function(card) {
		this.addCard(card, true);
	},
	boundingElement: $("#myhand"),

});

open1 = new cards.Hand({
	faceUp:true, 
	x:225, 
	y:375, 
	maxWidth: 200,
	boundingElement: $("#open1"),
	canDrop: function(card) {
		return card.container === this || 
			(card.container !== this && this.length < 13);
	},
	drop: function(card) {
		this.addCard(card, true);
	},
	isDraggable: function(card) {
		return true;
	}
});

open2 = new cards.Hand({
	faceUp:true, 
	x:225, 
	y:375, 
	maxWidth: 200,
	boundingElement: $("#open2"),
	canDrop: function(card) {
		return card.container === this || 
			(card.container !== this && this.length < 13);
	},
	drop: function(card) {
		this.addCard(card, true);
	},
	isDraggable: function(card) {
		return true;
	}
});

open3 = new cards.Hand({
	faceUp:true, 
	x:225, 
	y:375, 
	maxWidth: 200,
	boundingElement: $("#open3"),
	canDrop: function(card) {
		return card.container === this || 
			(card.container !== this && this.length < 13);
	},
	drop: function(card) {
		this.addCard(card, true);
	},
	isDraggable: function(card) {
		return true;
	}
});

//Lets add a discard pile
discardPile = new cards.Deck({faceUp:true, boundingElement: $("#pile"),
	canDrop: function(card) {
		return myTurn && state === "TURN_ACTIVE";
	},
	drop: function(card) {
		this.addCard(card);
		setState(false, "");
	},
});

deck.click(function(card){
	if (card === deck.topCard() && myTurn && state === "PICK_CARD") {
		setState(true, "TURN_ACTIVE");
		myhand.addCard(card);
		myhand.render();
	}
});

discardPile.click(function(card){
	if (card === discardPile.topCard() && myTurn && state === "PICK_CARD") {
		setState(true, "TURN_ACTIVE");
		myhand.addCard(card);
		myhand.render();
	}
});

$('#deal').click(function() {
	//Deck has a built in method to deal to hands.
	$('#deal').prop( "disabled", true );
	deck.deal(13, [hand2, hand1, hand3, myhand], 50, function() {
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
