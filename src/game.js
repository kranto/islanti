import * as $ from 'jquery';
import 'jquery-ui-bundle';
import 'jquery-ui-bundle/jquery-ui.css';
import cards from './cards.js';
// import Popper from 'popper.js';
import 'bootstrap/dist/js/bootstrap.bundle.min';

function centerX(element) {
  return parseInt(element.position().left) + parseInt(element.css("border-left-width")) + parseInt(element.css("margin-left")) + element.width() / 2;
}

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

function createNewOpenHand(playerId, handArray, selector) {
  let element = $(selector);
  let openhand = new cards.Hand({faceUp:true, spacing: 20, minWidth: 100, element: element});
  let index = handArray.length;
  handArray.push(openhand);

  element.droppable({
		accept: (cardElement) => {
      let card = cardElement.data('card');
      return openhand.accepts.filter(acc => acc.r === card.rank && (!acc.s || acc.s === card.suit)).length > 0;    
    },
		greedy: true,
		drop: function(event, ui) {
      var card = ui.draggable.data('card');
      let firstHalf = centerX(ui.draggable) < centerX(element);
      let dropIndex = openhand.getNewIndex(card);
      sendAction('complete', {card: card.id, player: playerId, hand: index, firstHalf: firstHalf, dropIndex: dropIndex});
		}
	});
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

  let imGuest = state.myhands === null || state.myhands.open === undefined;

  myClosedHandSections.forEach(section => section.element = null);
  myClosedHandSections = [];
  $(".hand-section").each(index => myClosedHandSections.push(createNewSection(index)));

  updateContainer(deck, state.deck, true);
	updateContainer(discardPile, state.pile, true);

  state.players.forEach((p, i) => {
    while (otherPlayers.length - 1 < i) {
      var closedhand = new cards.Hand({faceUp:false, minWidth: 100, spacing: 25, pullUp: true, element: $("#player" + i + " .closed-hand")});
      otherPlayers.push({closed: closedhand, open: []});
    }
    let otherPlayer = otherPlayers[i];
    updateContainer(otherPlayer.closed, p.closed);

    p.open.forEach((open, i2) => {
      while (otherPlayer.open.length - 1 < i2) {
        createNewOpenHand(p.id, otherPlayer.open, "#p" + i + "o" + i2);
      }
      updateContainer(otherPlayer.open[i2], open.cards);
      otherPlayer.open[i2].accepts = open.accepts;
    });
  });

  if (!imGuest) {
    state.myhands.closed.forEach((section, i) => {
      let hand = myClosedHandSections[i];
      updateContainer(hand, section);
    });
  
    let i = 0;
    while (myOpenHandSections.length < state.myhands.open.length) {
      createNewOpenHand(state.myhands.id, myOpenHandSections, "#myopen" + i);
      i++;
    }
  
    state.myhands.open.forEach((open, i) => {
      let hand = myOpenHandSections[i];
      updateContainer(hand, open.cards);
      hand.accepts = open.accepts;
    });
    
  }

  $("#pile").droppable({disabled: !state.can.discard});
  $(".open-hand").droppable({disabled: !state.can.complete});
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
  // console.log(params.state.players, otherPlayers);
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
      card.dragging = false;
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