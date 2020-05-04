
const pad = (num, size) => {
  let s = "000" + num;
  return s.substr(s.length - size);
};

class Card {
  constructor(back, suit, rank) {
    this.b = back;
    this.s = suit;
    this.r = rank;
  }

  setId(id) {
    this.i = id;
    this.str = this.stringPresentation();
  }

  stringPresentation() {
    return pad(this.i, 3) + this.b + (this.s !== undefined ? this.s : "") + (this.r !== undefined ? this.r : "");
  }

  static value(r) {
    return r === 0 ? 25 : r === 1 ? 15 : r <= 7 ? 5 : 10;
  }
}

const shuffle = (anyArray) => {
  for (var k in [1, 2, 3, 4, 5, 6]) {
    var i = anyArray.length;
    while (--i >= 0) {
      var j = Math.floor(Math.random() * anyArray.length);
      var temp = anyArray[i];
      anyArray[i] = anyArray[j];
      anyArray[j] = temp;
    }
  }
  return anyArray;
};

const cardsToString = (cards) => cards.map(card => card.str);
const anonymise = (cardStrings) => cardStrings ? cardStrings.map(cardStr => cardStr.substring(0, 4)) : null;

const createCards = () =>{
  return [0, 1].map(back =>
    ['h', 's', 'd', 'c'].map(suit =>
      [...Array(13).keys()].map(rank => new Card(back, suit, rank + 1))).concat([
        new Card(back, 'r', 0), new Card(back, 'b', 0)
      ])
  ).flat(3)
};

const createCardsAndShuffle = () => {
  let cards = createCards();
  shuffle(cards);
  cards.forEach((card, index) => card.setId(index));
  shuffle(cards);
  return cards;
}

module.exports = {
  createCardsAndShuffle: createCardsAndShuffle,
  shuffle: shuffle,
  cardsToString: cardsToString,
  anonymise: anonymise
};

