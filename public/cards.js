
var cards = (function() {
	//The global options
	var opt = {
		cardSize : {width:69,height:94, padding:40},
		animationSpeed : 300,
		table : 'body',
		blackJoker : false,
		redJoker : false
	};
	var zIndexCounter = 1;
	var all = []; //All the cards created.
	
	var containers = [];

	function mouseEvent(ev) {
		var card = $(this).data('card');
		if (card.container) {
			var handler = card.container["_" + ev.type];
			if (handler) {
				handler.func.call(handler.context||window, card, ev);
			}
		}
	}
	
	function init(options) {
		if (options) {
			for (var i in options) {
				if (opt.hasOwnProperty(i)) {
					opt[i] = options[i];
				}
			}
		}
		var start = 1;
		var end = 13;
		opt.table = $(opt.table)[0];
		if ($(opt.table).css('position') == 'static') {
			$(opt.table).css('position', 'relative');
		}

		for (var i = start; i <= end; i++) {
			all.push(new Card('h', i, opt.table, 'blue'));
			all.push(new Card('s', i, opt.table, 'blue'));
			all.push(new Card('d', i, opt.table, 'blue'));
			all.push(new Card('c', i, opt.table, 'blue'));
			all.push(new Card('h', i, opt.table, 'red'));
			all.push(new Card('s', i, opt.table, 'red'));
			all.push(new Card('d', i, opt.table, 'red'));
			all.push(new Card('c', i, opt.table, 'red'));
		}
		if (opt.blackJoker) {
			all.push(new Card('bj', 0, opt.table, 'blue'));
			all.push(new Card('bj', 0, opt.table, 'red'));
		}
		if (opt.redJoker) {
			all.push(new Card('rj', 0, opt.table, 'blue'));
			all.push(new Card('rj', 0, opt.table, 'red'));
		}

		$('.playingcard').click(mouseEvent);

		$('.playingcard').draggable({
			stack: ".playingcard",
			containment: "parent",
			placement: "top",
			start: function() { $(this).stop(); },
			drag: function() {},
			stop: function() {}
		});

		shuffle(all);
	};

	function shuffle(deck) {
		for (var k in [1,2]) {
			var i = deck.length;
			while (--i >= 0) {
					var j = Math.floor(Math.random() * (i + 1));
					var temp = deck[i];
					deck[i] = deck[j];
					deck[j] = temp;
			}	
		}
	}
	
	function Card(suit, rank, table, back) {
		this.init(suit, rank, table, back);
	}
	
	Card.prototype = {
		init: function (suit, rank, table, back) {
			this.shortName = suit + rank;
			this.suit = suit;
			this.rank = rank;
			this.name = suit.toUpperCase()+rank;
			this.faceUp = false;
			this.cardback = back || opt.cardback;
			this.el = $('<div/>').css({
				width:opt.cardSize.width,
				height:opt.cardSize.height,
				position:'absolute',
				cursor:'pointer'	
			}).addClass('playingcard').data('card', this).appendTo($(table));
			this.el.html('<img src="svg/' + this.shortName + '.svg" alt="' + this.shortName + '" draggable="false" class="faceup-img">' 
				+'<img src="svg/cardback_' + this.cardback + '.svg" alt="' + "card face down" + '" draggable="false" class="facedown-img">');
			this.showCard();
			this.moveToFront();
		},

		toString: function () {
			return this.name;
		},

		showCard : function() {
			$(this.el).find(".faceup-img").show();
			$(this.el).find(".facedown-img").hide();
		},

		hideCard : function(position) {
			$(this.el).find(".faceup-img").hide();
			$(this.el).find(".facedown-img").show();
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
	
	Container.prototype = new Array();
	Container.prototype.extend = function(obj) {
		for (var prop in obj) {
			this[prop] = obj[prop];
		}
	}
	Container.prototype.extend({
		addCard : function(card, doReorder) {
			this.addCards([card], doReorder);
		},
		
		addCards : function(cards, doReorder) {
			for (var i = 0; i < cards.length;i++) {
				var card = cards[i];
				if (card.container && card.container !== this) {
					card.container.removeCard(card);
				}
				if (!card.container || card.container !== this) {
					this.push(card);
				}
				card.container = this;
				$(card.el).draggable(this.isDraggable ? "enable" : "disable");
			}
			if (doReorder) this.reorder();
			if (this.setElementWidth) this.setElementWidth();
		},
		
		removeCard : function(card) {
			for (var i=0; i< this.length;i++) {
				if (this[i] == card) {
					this.splice(i, 1);
					if (this.setElementWidth) this.setElementWidth();
					return true;
				}
			}
			return false;
		},

		init : function(options) {
			options = options || {};
			this.maxWidth = options.maxWidth || 1000000;
			this.minWidth = options.minWidth;
			this.padding = options.padding;
			this.faceUp = options.faceUp;
			this.element = options.element;
			this.isDraggable = options.isDraggable;

			if (this.element) {
				this.element.data('container', this);
			}

			containers.push(this);
		},

		click : function(func, context) {
			this._click = {func:func,context:context};
		},

		mousedown : function(func, context) {
			this._mousedown = {func:func,context:context};
		},
		
		mouseup : function(func, context) {
			this._mouseup = {func:func,context:context};
		},
		
		reorder : function() {
			this.sort(function(a, b) { return a.rect().x - b.rect().x; });
		},

		render : function(options) {
			options = options || {};
			var speed = options.speed || opt.animationSpeed;
			this.calcPosition(options);
			for (var i=0;i<this.length;i++) {
				var card = this[i];
				card.moveToFront();
				var top = parseInt($(card.el).css('top'));
				var left = parseInt($(card.el).css('left'));
				if (top != card.targetTop || left != card.targetLeft) {
					var props = {top:card.targetTop, left:card.targetLeft, queue:false};
					if (options.immediate) {
						$(card.el).css(props);
					} else {
						$(card.el).animate(props, speed);
					}
				}
			}
			var me = this;
			var flip = function(){
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
		},
		
		toString: function() {
			return 'Container';
		}
	});
	
	function Deck(options) {
		this.init(options);
	}
	
	Deck.prototype = new Container();
	Deck.prototype.extend({
		calcPosition : function(options) {
			options = options || {};
			var boundingRect = this.element ? elementRect(this.element) : { x: this.x, y: this.y, width: 0, height: 0};
			var centerX = boundingRect.x + boundingRect.width / 2;
			var centerY = boundingRect.y + boundingRect.height / 2;
			options = options || {};
			var left = Math.round(centerX - opt.cardSize.width/2, 0);
			var top = Math.round(centerY - opt.cardSize.height/2, 0);
			var condenseCount = 6;
			for (var i=0;i<this.length;i++) {
				if (i > 0 && i % condenseCount == 0) {
					top-=1;
					left-=1;
				}
				this[i].targetTop = top;
				this[i].targetLeft = left;
			}
		},
		
		toString : function() {
			return 'Deck';
		},
		
		deal : function(count, hands, speed, callback) {
			var me = this;
			var i = 0;
			var totalCount = count*hands.length;
			function dealOne() {
				if (me.length == 0 || i == totalCount) {
					if (callback) {
						callback();
					}
					return;
				}
				hands[i%hands.length].addCard(me.topCard());
				hands[i%hands.length].render({callback:dealOne, speed:speed});
				i++;
			}
			dealOne();
		}
	});

	function Hand(options) {
		this.init(options);
	}

	Hand.prototype = new Container();
	Hand.prototype.extend({
		setElementWidth: function() {
			if (!this.minWidth) return;
			var pad = opt.cardSize.padding;
			var desiredWidth = opt.cardSize.width + Math.max(this.length - 1, 0) * pad;
			var width = Math.max(this.minWidth, desiredWidth);
			this.element.width(width);
		},
		calcPadding: function(options) {
			var maxWidth = this.element ? elementRect(this.element).width - 10 : false || this.maxWidth;
			var pad = options.padding ? options.padding : opt.cardSize.padding;
			var desiredWidth = Math.max(this.length - 1, 0) * pad + opt.cardSize.width;
			return desiredWidth  <= maxWidth ? pad : (maxWidth - opt.cardSize.width) / Math.max(this.length - 1, 0);
		},
		calcPosition : function(options) {
			options = options || {};
			var padding = this.calcPadding(options);
			var cardWidth = opt.cardSize.width + (this.length-1)*padding;
			var boundingRect = this.element ? elementRect(this.element) : { x: this.x, y: this.y, width: 0, height: 0};
			var centerX = boundingRect.x + boundingRect.width / 2;
			var centerY = boundingRect.y + boundingRect.height / 2;
			var left = Math.round(centerX - cardWidth/2);
			var top = Math.round(centerY - opt.cardSize.height/2, 0);
			for (var i=0;i<this.length;i++) {
				this[i].targetTop = top;
				this[i].targetLeft = left + i * padding;
			}
		},

		toString : function() {
			return 'Hand';
		}
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

	var refresh = function() {
		containers.forEach(function(c) { c.render(); });
	}

	return {
		init : init,
		all : all,
		options : opt,
		SIZE : opt.cardSize,
		Card : Card,
		Container : Container,
		Deck : Deck,
		Hand : Hand,
		shuffle: shuffle,
		refresh: refresh
	};
	 
})();

if (typeof module !== 'undefined') {
    module.exports = cards;
}

