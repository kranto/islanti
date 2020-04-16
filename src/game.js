import * as $ from 'jquery';
import 'jquery-ui-bundle';
import 'jquery-ui-bundle/jquery-ui.css';
import cards from './cards.js';
// import Popper from 'popper.js';
import 'bootstrap/dist/js/bootstrap.bundle.min';


window.jQuery = $;
require('jquery-ui-touch-punch');

var game = (function() {

var allCards = [];

var state = {};

let deck;
let otherPlayers = [];
let myClosedHandSections = [];
let myOpenHandSections = [];
let discardPile;

function createNewSection(index) {
	var el = $("#section" + index);
	var section = new cards.Hand({
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
      let index = section.getNewIndex(card);
      newOrder(card, section, index);
		}
	});
	// el.popover({
	// 	container: '.CardTable',
	// 	placement: 'top',
	// 	trigger: 'manual',
	// 	content: () => section.validity.msg
	// });
	return section;
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
  container.forEach(card => container.removeCard(card));
  container.addCards(reverse ? cards.reverse() : cards);
	setTimeout(() => container.render(), 0);
}

function populateState() {

  updateContainer(deck, state.deck, true);
	updateContainer(discardPile, state.pile, true);

  state.players.forEach((p, i) => {
    while (otherPlayers.length - 1 < i) {
      var closedhand = new cards.Hand({faceUp:false, pullUp: true, element: $("#player" + i + " .closed-hand")});
      otherPlayers.push({closed: closedhand, open: []});
    }
    let otherPlayer = otherPlayers[i];
    updateContainer(otherPlayer.closed, p.closed);

    p.open.forEach((c, i2) => {
      while (otherPlayer.open.length - 1 < i2) {
        let openhand = new cards.Hand({faceUp:true, spacing: 25, minWidth: 100, element: $("#p" + i + "o" + i2)});
        otherPlayer.open.push(openhand);
      }
      updateContainer(otherPlayer.open[i2], p.open[i2]);
    });
  });
  
	state.myhands.closed.forEach((section, i) => {
    let hand = myClosedHandSections[i];
    updateContainer(hand, section);
  });

  let i = 0;
  while (myOpenHandSections.length < state.myhands.open.length) {
    let openhand = new cards.Hand({faceUp:true, spacing: 25, minWidth: 100, element: $("#myopen" + i)});
    myOpenHandSections.push(openhand);
    i++;
  }

  state.myhands.open.forEach((section, i) => {
    let hand = myOpenHandSections[i];
    updateContainer(hand, section);
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
  
  $(".hand-section").each(index => myClosedHandSections.push(createNewSection(index)));
}

return {
  init: init,
  stateChange: stateChange
};

})();

export default game;