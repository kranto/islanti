
const ROUNDS = [
  { roundNumber: 1, roundName: "kolmoset ja suora", expectedSets: 1, expectedStraights: 1, isFreestyle: false },
  { roundNumber: 2, roundName: "kahdet kolmoset", expectedSets: 2, expectedStraights: 0, isFreestyle: false },
  { roundNumber: 3, roundName: "kaksi suoraa", expectedSets: 0, expectedStraights: 2, isFreestyle: false },
  { roundNumber: 4, roundName: "kahdet kolmoset ja suora", expectedSets: 2, expectedStraights: 1, isFreestyle: false },
  { roundNumber: 5, roundName: "kolmoset ja kaksi suoraa", expectedSets: 1, expectedStraights: 2, isFreestyle: false },
  { roundNumber: 6, roundName: "kolmet kolmoset", expectedSets: 3, expectedStraights: 0, isFreestyle: false },
  { roundNumber: 7, roundName: "kolme suoraa", expectedSets: 0, expectedStraights: 3, isFreestyle: false },
  { roundNumber: 8, roundName: "freestyle", expectedSets: 1, expectedStraights: 1, isFreestyle: true },
];

const calculateScore = (sections) => {
  return sections.flat().reduce((sum, card) => Card.value(card.r) + sum, 0);
}

const validateOpening = (selected, allClosedCards, round) => {
  let sets = [];
  let straights = [];

  for (let i = 0; i < selected.length; i++) {
    let validity = selected[i];
    if (!validity.valid) {
      return { valid: false, msg: "Joku valituista sarjoista ei ole sallittu." };
    }
    if (validity.type === 'straight') {
      straights.push(validity.data);
    }
    if (validity.type === 'set') {
      sets.push(validity.data);
    }
  }

  if (sets.length !== round.expectedSets && !round.isFreestyle) {
    return { valid: false, msg: "Pitäisi olla " + round.expectedSets + " kolmoset, mutta onkin " + sets.length };
  }
  if (straights.length !== round.expectedStraights && !round.isFreestyle) {
    return { valid: false, msg: "Pitäisi olla " + round.expectedStraights + " suoraa, mutta onkin " + straights.length };
  }

  var setsNumbers = [];
  for (let i = 0; i < sets.length; i++) {
    if (setsNumbers.indexOf(sets[i].rank) >= 0) {
      return { valid: false, msg: "Kaikki kolmossarjat täytyy olla eri numeroa" };
    }
    setsNumbers.push(sets[i].rank);
  }
  var straightSuits = [];
  for (let i = 0; i < straights.length; i++) {
    console.log('straightsuits', straightSuits, straights[i])
    if (straightSuits.indexOf(straights[i].suit) >= 0) {
      return { valid: false, msg: "Suorat täytyy olla eri maista" };
    }
    straightSuits.push(straights[i].suit);
  }

  if (round.isFreestyle) {
    let playerCardsCount = allClosedCards.flat().length;
    let selectedCardsCount = selected.map(validity => validity.data.cards).flat().length;
    if (selectedCardsCount < playerCardsCount - 1) {
      return { valid: false, msg: "Freestylessä saa käteen jäädä korkeintaan yksi kortti" };
    }
  }

  return { valid: true };
}

const testSection = (section, round) => {
  console.log('testSection', section, round);
  var straight = round.expectedStraights > 0 ? testStraight(section) : false;
  var set = round.expectedSets > 0 ? testSet(section) : false;

  if (straight && straight.valid) return { type: 'straight', valid: true, msg: 'Suora', data: straight };
  if (set && set.valid) return { type: 'set', valid: true, msg: 'Kolmoset', data: set };

  return { valid: false, type: false, msg: (straight ? (straight.msg + ". ") : "") + (set ? (set.msg + ".") : "") };
}

const testStraight = (section) => {
  if (section.length < 4) {
    return { valid: false, msg: "Suorassa täytyy olla vähintään neljä korttia" };
  }
  if (section.length > 13) {
    return { valid: false, msg: "Suorassa ei saa olla yli 13 korttia" };
  }

  let others = section.filter(c => c.r > 0);
  let jokers = section.filter(c => c.r === 0);
  let aces = others.filter(c => c.r === 1);
  let suit = others[0].s;

  if (others.filter(c => c.s !== suit).length > 0) {
    return { valid: false, msg: "Suorassa saa olla vain yhtä maata" };
  }
  if (jokers.length >= others.length) {
    return { valid: false, msg: "Suorassa vähintään puolet korteista pitää olla muita kuin jokereita" }
  }
  if (aces.length > 1) {
    return { valid: false, msg: "Suorassa voi olla vain yksi ässä" };
  }

  let ranks = section.map(c => c.r);
  let otherRanks = ranks.filter(r => r > 0);
  let otherRanksThanAces = otherRanks.filter(r => r > 1);

  if (otherRanksThanAces.length < 2) { // this should never occur
    return { valid: false, msg: "Suorassa pitää olla ainakin 2 muuta korttia kuin ässä ja jokeri" };
  }

  let increasing = otherRanksThanAces[0] < otherRanksThanAces[1];

  if (!increasing) {
    section = [...section].reverse();
    others = [...others].reverse();
    jokers = [...jokers].reverse();
    ranks = [...ranks].reverse();
    otherRanks = [...otherRanks].reverse();
    otherRanksThanAces = [...otherRanksThanAces].reverse();
  }

  let minRank = otherRanksThanAces[0] - ranks.indexOf(otherRanksThanAces[0]);
  let maxRank = minRank + ranks.length - 1;
  if (minRank < 1 || maxRank > 14) {
    return { valid: false, msg: "Suorassa täytyy olla kortit oikeassa järjestyksessä" };
  }

  let accepts = [];
  let acceptsJoker = jokers.length < others.length - 1;
  if (minRank > 1 && ranks.length < 13) {
    accepts.push({ s: suit, r: minRank - 1, ind: 0 });
    if (acceptsJoker) {
      accepts.push({ r: 0, ind: 0 });
    }
  }

  for (var i = 0; i < ranks.length; i++) {
    if (ranks[i] === 0) {
      accepts.push({ s: suit, r: minRank + i, ind: i, replace: true })
    } else if (ranks[i] !== minRank + i && (ranks[i] !== 1 || minRank + i !== 14)) {
      return { valid: false, msg: "Suorassa täytyy olla kortit oikeassa järjestyksessä" }
    }
  }

  if (maxRank < 14 && ranks.length < 13) {
    accepts.push({ s: suit, r: (maxRank == 13 ? 1 : maxRank + 1), ind: ranks.length });
    if (acceptsJoker) {
      accepts.push({ r: 0, ind: ranks.length });
    }
  }

  return {
    type: 'straight',
    valid: true,
    suit: suit,
    cards: section,
    minRank: minRank,
    maxRank: maxRank,
    accepts: accepts
  };
}

const testSet = (hand) => {
  if (hand.length < 3) {
    return { valid: false, msg: "Kolmosissa täytyy olla vähintään kolme korttia" };
  }

  var jokers = hand.filter(c => c.r === 0);
  var others = hand.filter(c => c.r > 0);

  if (jokers.length >= others.length) {
    return { valid: false, msg: "Kolmosissa vähintään puolet korteista pitää olla muita kuin jokereita" }
  }

  let rank = others[0].r;
  if (others.filter(c => c.r !== rank).length > 0) {
    return { valid: false, msg: "Kolmosissa saa olla vain yhtä numeroa" };
  }

  let accepts = [{ r: rank, ind: 0 }];
  if (jokers.length < others.length - 1) accepts.push({ r: 0, ind: 0 });

  return {
    type: 'set',
    valid: true,
    rank: rank,
    cards: hand,
    accepts: accepts
  };
}

module.exports = {
  ROUNDS: ROUNDS,
  calculateScore: calculateScore,
  validateOpening: validateOpening,
  testSection: testSection
};
