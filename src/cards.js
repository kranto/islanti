import $ from 'jquery';
import 'jquery-ui-bundle';
import 'jquery-ui-bundle/jquery-ui.css';

var cards = (function() {

	var opt = {
		cardSize : {width:69, height:94, spacing:40}
	};

	var zIndexCounter = 1;	

	function mouseEvent(ev) {
		var card = $(this).data('card');
		if (card && card.container) {
			var handler = card.container["_" + ev.type];
			if (handler) {
				handler.func.call(handler.context||window, card, ev);
			}
		}
	}
	
	function Card(suit, rank, back, id, table) {
		this.init(suit, rank, back, id, table);
	}
	
	Card.prototype = {
		init: function (suit, rank, back, id, table) {
			this.id = id;
			this.el = $('<div/>').addClass('playingcard').data('card', this).appendTo($(table));
			this.el.html(
				'<img src="" alt="card face up" class="faceup-img"/>' +
				'<img src="" alt="card face down" class="facedown-img"/>'
			);


			$(this.el).css("opacity", 0);
			setTimeout(() => $(this.el).css("opacity", 1), 1000);

			this.reveal(suit, rank, back);
			this.faceUp = false;
			this.moveToFront();


			$(this.el).click(mouseEvent);

			$(this.el).draggable({
				stack: ".playingcard",
				containment: ".CardTable",
				placement: "top"
			});	
		},

		reveal(suit, rank, back) {
			if (this.suit === suit && this.rank === rank && this.back === back) return;
			setTimeout(() => {
				this.suit = suit;
				this.rank = rank;
				this.cardback = back === 1 ? 'red' : 'blue';
				this.name = suit ? suit + rank : "e";
				$(this.el).find(".faceup-img").attr("src", "svg/" + this.name + ".svg");
				$(this.el).find(".facedown-img").attr("src", "svg/cardback_" + this.cardback + ".svg");	
			}, this.suit !== undefined && suit === undefined ? 2000 : 0); // delay anonymisign so that the card has been flipped
		},

		pullUp: function(pixels) {
			var top = parseInt($(this.el).css('top'));
			$(this.el).css({top: (top-pixels), transition: 'none'});
		},

		showCard : function() {
			$(this.el).toggleClass("faceup", true);
		},

		hideCard : function(position) {
			$(this.el).toggleClass("faceup", false);
		},
		
		moveToFront : function() {
			$(this.el).css('z-index', zIndexCounter++);
		},

		rect : function() {
			return elementRect(this.el);
		}
	};
	
	function Container() {	
	}
	
	Container.prototype = [];
	Container.prototype.extend = function(obj) {
		for (var prop in obj) {
			this[prop] = obj[prop];
		}
	}

	Container.prototype.extend({
		addCard : function(card) {
			this.addCards([card]);
		},		
		addCards : function(cards) {
			for (var i = 0; i < cards.length;i++) {
				var card = cards[i];
				if (card.container && card.container !== this) {
					card.container.removeCard(card);
				}
				if (!card.container || card.container !== this) {
					this.push(card);
				}
				card.container = this;
				card.el.draggable(this.isDraggable ? "enable" : "disable");
			}
			if (this.setElementWidth) this.setElementWidth();
		},
		removeCard : function(card) {
			let index = this.indexOf(card);
			if (index >= 0) {
				this.splice(this.indexOf(card), 1);
				card.container = null;
				if (this.setElementWidth) this.setElementWidth();
			}
		},

		init : function(options) {
			options = options || {};
			this.maxWidth = options.maxWidth || 1000000;
			this.minWidth = options.minWidth;
			this.spacing = options.spacing || opt.cardSize.spacing;
			this.faceUp = options.faceUp;
			this.element = options.element;
			this.isDraggable = options.isDraggable;
			this.pullUp = options.pullUp;

			if (this.element) {
				this.element.data('container', this);
			}
		},

		click : function(func, context) {
			this._click = {func:func,context:context};
		},

		getNewIndex: function(card) {
			let newX = card.rect().x;
			return this.filter(c => c !== card && c.rect().x < newX).length;
		},

		moveCardToTarget: function(card) {
			if (card.currTop !== card.targetTop || Math.abs(card.currLeft - card.targetLeft) > 5) {
				if (this.pullUp && card.currTop === card.targetTop) {
					card.pullUp(15 *  Math.sign(card.currLeft - card.targetLeft));
				}
				let distance = Math.max(Math.abs(card.currTop-card.targetTop), Math.abs(card.currLeft-card.targetLeft)); 
				card.el.toggleClass("fast-move", (distance < opt.cardSize.height && !this.pullUp));

				setTimeout(() => {
					var props = {top:card.targetTop, left:card.targetLeft, transition: ""};
					$(card.el).css(props);
				}, 0);
			}
		},

		render : function(options) {
			options = options || {};
			var speed = options.speed;
			this.calcPosition(options);
			for (var i=0;i<this.length;i++) {
				var card = this[i];
				card.moveToFront();
				card.currTop = parseInt($(card.el).css('top'));
				card.currLeft = parseInt($(card.el).css('left'));
				this.moveCardToTarget(card);
			}
			var me = this;
			var flip = function() {
				for (var i=0;i<me.length;i++) {
					if (me.faceUp) {
						me[i].showCard();
					} else {
						me[i].hideCard();
					}
				}
			}
			if (options.immediate) {
				flip();
			} else {
				setTimeout(flip, speed *4/5);
			}
			
			if (options.callback) {
				setTimeout(options.callback, speed);
			}
		},
		
		topCard : function() {
			return this[this.length-1];
		}
	});
	
	function Deck(options) {
		this.init(options);
	}
	
	Deck.prototype = new Container();
	Deck.prototype.extend({
		calcPosition : function(options) {
			var boundingRect = this.element ? elementRect(this.element) : { x: this.x, y: this.y, width: 0, height: 0};
			var centerX = boundingRect.x + boundingRect.width / 2;
			var centerY = boundingRect.y + boundingRect.height / 2;
			var left = Math.round(centerX - opt.cardSize.width/2, 0);
			var top = Math.round(centerY - opt.cardSize.height/2, 0);
			var condenseCount = 6;
			for (var i=0;i<this.length;i++) {
				if (i > 0 && i % condenseCount === 0) {
					top-=1;
					left-=1;
				}
				this[i].targetTop = top;
				this[i].targetLeft = left;
			}
		}
	});

	function Hand(options) {
		this.init(options);
	}

	Hand.prototype = new Container();
	Hand.prototype.extend({
		setElementWidth: function() {
			if (!this.minWidth || !this.element) return;
			var pad = this.spacing;
			var desiredWidth = opt.cardSize.width + Math.max(this.length - 1, 0) * pad;
			var width = Math.max(this.minWidth, desiredWidth);
			this.element.width(width);
		},
		calcSpacing: function(options) {
			var maxWidth = this.element ? elementRect(this.element).width - 10 : false || this.maxWidth;
			var spacing = options.spacing ? options.spacing : opt.cardSize.spacing;
			var desiredWidth = Math.max(this.length - 1, 0) * spacing + opt.cardSize.width;
			return desiredWidth  <= maxWidth ? spacing : (maxWidth - opt.cardSize.width) / Math.max(this.length - 1, 0);
		},
		calcPosition : function(options) {
			options = options || {};
			var spacing = this.calcSpacing(options);
			var cardWidth = opt.cardSize.width + (this.length-1)*spacing;
			var boundingRect = this.element ? elementRect(this.element) : { x: this.x, y: this.y, width: 0, height: 0};
			var centerX = boundingRect.x + boundingRect.width / 2;
			var centerY = boundingRect.y + boundingRect.height / 2;
			var left = Math.round(centerX - cardWidth/2);
			var top = Math.round(centerY - opt.cardSize.height/2, 0);
			for (var i=0;i<this.length;i++) {
				this[i].targetTop = top;
				this[i].targetLeft = left + i * spacing;
			}
		},
	});
	
	var elementRect = function(element) {
		return {
			x: parseInt(element.position().left) +
				parseInt(element.css("border-left-width")) +
				parseInt(element.css("margin-left")),
			y: parseInt(element.position().top) +
				parseInt(element.css("border-top-width")) +
				parseInt(element.css("margin-top")),
			width: element.width(),
			height: element.height()
		};
	}

	return {
		options : opt,
		Card : Card,
		Container : Container,
		Deck : Deck,
		Hand : Hand,
	};
	 
})();

export default cards;