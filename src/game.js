import * as $ from 'jquery';
import 'jquery-ui-bundle';
import 'jquery-ui-bundle/jquery-ui.css';
import cards from './cards.js';
// import Popper from 'popper.js';
import 'bootstrap/dist/js/bootstrap.bundle.min';


window.jQuery = $;
require('jquery-ui-touch-punch');

var game = (function() {

var OPENING = "OPENING";

var allCards = [];

var state = {};

let deck;
let otherHands = [];
let myClosedHandSections = [];
let discardPile;

function createNewSection() {
	var el = $("#section-template").clone().removeAttr("id").addClass('hand-section').show();
	el.insertBefore("#newsection");
	var hand = new cards.Hand({
		faceUp: true,
		element: el,
		minWidth: 80,
		isDraggable: true
	});
	el.droppable({
		accept: ".playingcard",
		greedy: true,
		drop: function(event, ui) {
      var card = ui.draggable.data('card');
      let index = hand.getNewIndex(card);
      newOrder(card, hand, index);
		}
	});
	el.click(sectionClicked);
	el.popover({
		container: '.CardTable',
		placement: 'top',
		trigger: 'manual',
		content: () => "testiviesti" //hand.validity.msg
	});
	return hand;
}

function sectionClicked() {
	if ($(this).hasClass("selected")) {
		$(this).toggleClass("selected", false);
		$(this).popover('hide');
	} else {
		$(this).toggleClass("selected", true);
		// $(this).toggleClass("error", !$(this).data("container").validity.valid);
		$(this).popover('show');
	}
	updateConfirmButton();
}

function updateConfirmButton() {
	var selected = [];
	$(".section.selected").each(function() {
		selected.push($(this).data('container'));
	});

	var myAllCards = myClosedHandSections.reduce(function(acc, hand) {return acc + hand.length}, 0);

	// validity = validateSelected(selected, myAllCards);
	// $("#confirmOpenButton").prop("disabled", !validity.valid);
	showValidityMessage();
}

var validity = {valid: true, msg: "Kaikki kunnossa"}; 
function showValidityMessage() {
	$("#errormsg").text(validity.valid ? "" : validity.msg);
}

// ===========

function findCard(servercard) {
	let card = allCards.filter(c => c.id === servercard.i)[0];
	if (!card) {
		card = new cards.Card(servercard.s, servercard.r, servercard.b, servercard.i, ".CardTable");
		allCards.push(card);
	}
	card.reveal(servercard.s, servercard.r, servercard.b);
	return card;
}

function updateContainer(container, servercards, reverse) {
	let cards = servercards.map(servercard => findCard(servercard));
	cards.forEach(card => {if (card.container) card.container.removeCard(card); });
  container.addCards(reverse ? cards.reverse() : cards);
	container.render();
}

function populateState() {

  updateContainer(deck, state.deck, true);
	updateContainer(discardPile, state.pile, true);

  state.players.forEach((p, i) => {
    while (otherHands.length - 1 < i) {
      var hand = new cards.Hand({faceUp:false, pullUp: true, element: $("#player" + i + " .closed-hand")});
      otherHands.push(hand);
    }
    updateContainer(otherHands[i], p.closed);
  });

  myClosedHandSections.forEach(hand => {hand.element.remove(); hand.element.popover('dispose'); });
	myClosedHandSections = [];

	state.myhands.closed.forEach((c, i) => {
		while (myClosedHandSections.length - 1 < i) {
      myClosedHandSections.push(createNewSection());
		}
		let hand = myClosedHandSections[i];
    updateContainer(hand, c);
  });
  
  $("#pile").droppable({disabled: !state.can.discard});  
}

function sendAction(action, params) {
  stateManager.sendAction(action, params);
}

function newSection(firstCardInNewSection) {
  let newOrder = myClosedHandSections.map(hand => hand.map(card => card.id).filter(id => id !== firstCardInNewSection.id));
  newOrder = [...newOrder, [firstCardInNewSection.id]].filter(section => section.length > 0);
	sendAction('newOrder', {order: newOrder});
}

function newOrder(movedCard, hand, index) {
  let handIndex = myClosedHandSections.indexOf(hand);
  let newOrder = myClosedHandSections.map(hand => hand.map(card => card.id).filter(id => id !== movedCard.id));
  newOrder[handIndex].splice(index,0,movedCard.id);
  newOrder = newOrder.filter(section => section.length > 0);
  sendAction('newOrder', {order: newOrder});
  stateManager.testSeries(handIndex, function(response) {console.log(response); });
}

function stateChange(params) {
	console.log(params);
	switch (params.action) {
		case 'init': case 'fullState':
      state = params.state;
			populateState();
			break;
		default:
			break;
	}
}

var stateManager;

function init(_stateManager) {

  stateManager = _stateManager;
  
	$(window).resize(function(){
		// setTimeout( () =>cards.refresh(), 100);
		setTimeout(populateState, 100);
	});

	deck = new cards.Deck({
    faceUp: false,
    element: $("#deck")
  }); 

  deck.click(() => {
		if (state.can.pick) {
      sendAction('pickCard', {fromDeck: true});
		}
	});
	
	discardPile = new cards.Deck({
    faceUp: true, 
    element: $("#pile")
	});

	discardPile.click(() => {
    if (state.can.buy) {
      sendAction('requestToBuy');
    } else if (state.can.sell) {
      sendAction('dontsell');
    } else if (state.can.pick) {
      sendAction('pickCard', {fromDeck: false});
		}
	});

  $("#pile").droppable({
		accept: ".playingcard",
		greedy: true,
		drop: function(event, ui) {
      var card = ui.draggable.data('card');
      sendAction('discarded', {card: card.id});
		}
	});
	
	$("#newsection").droppable({
		accept: ".playingcard",
		greedy: true,
		drop: function(event, ui) {
      var card = ui.draggable.data('card');
      newSection(card);
		}
	});
		
	$(".CardTable").droppable({
		accept: ".playingcard",
		drop: function(event, ui) {
			var card = ui.draggable.data('card');
			card.container.render();
		}
	});
	
	// $("#openButton").click(() => {
	// 	validateHands();
	// 	setState(true, OPENING);
	// 	updateConfirmButton();
	// });
	
	// $("#cancelOpenButton").click(function() {
	// 	$("section").toggleClass("selected", false);
	// 	$("section").popover('hide');
	// 	updateConfirmButton();
	// 	setState(true, TURN_ACTIVE);
	// });
	
	// $("#confirmOpenButton").click(function() {
	// 	var selected = [];
	// 	$("section.selected").each(function() {
	// 		selected.push($(this).data('container'));
	// 	});
	
	// 	$("section").toggleClass("selected", false);
	// 	$("section").popover('hide');
	
	// 	alert("Avasit!");
	
	// 	setState(true, TURN_ACTIVE);
	// });
	
	$("#selectseries").popover({
		container: '.CardTable',
		placement: 'top',
		trigger: 'manual',
		content: () => validity.msg
	});		

  // stateManager.subscribeTo('stateChange', stateChange);

	// setState(false, "");
}

return {
  init: init,
  stateChange: stateChange
};

})();

export default game;