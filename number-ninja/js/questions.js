/**
 * questions.js — Number Ninja
 * -------------------------------------------------------
 * Generates all math questions.
 *
 * Easy / Medium  →  2 numbers, 1 hidden operation
 *   Display:  [a]  [?]  [b]  =  result
 *   Player guesses the single operation.
 *
 * Hard  →  3 numbers, 2 operations, but only ONE is hidden.
 *   The first operation is REVEALED; the second is hidden.
 *   Display:  [a]  [op1]  [b]  [?]  [c]  =  result
 *   Player guesses op2.
 *   This keeps hard mode fair and unambiguous.
 *
 * Guarantees:
 *   - Division always produces a whole-number answer ≥ 1
 *   - No negative or zero results
 *   - Numbers scale with difficulty
 * -------------------------------------------------------
 */

const QuestionGenerator = (() => {

  // ---- Utilities ----

  function randInt(min, max) {
    if (min >= max) return min;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /** [dividend, divisor] where dividend / divisor is a whole number ≥ 1 */
  function safeDivPair(maxDivisor, maxQuotient) {
    const divisor  = randInt(2, maxDivisor);
    const quotient = randInt(1, maxQuotient);
    return [divisor * quotient, divisor];
  }

  /** Integer divisors of n in range [2, cap] */
  function divisorsOf(n, cap) {
    cap = cap || 10;
    const d = [];
    for (let i = 2; i <= Math.min(n, cap); i++) {
      if (n % i === 0) d.push(i);
    }
    return d;
  }

  // ---- Difficulty configs ----

  const CFG = {
    easy:   { lo: 2,  hi: 12, divDivisor: 6,  divQuotient: 10, mulMax: 9  },
    medium: { lo: 5,  hi: 25, divDivisor: 12, divQuotient: 12, mulMax: 12 },
    hard:   { lo: 3,  hi: 20, divDivisor: 10, divQuotient: 10, mulMax: 9  },
  };

  const ALL_OPS = ['+', '-', '*', '/'];

  // Human-readable symbol map (used by UI)
  const OP_SYMBOL = { '+': '+', '-': '−', '*': '×', '/': '÷' };

  // ---- Two-number question (Easy / Medium) ----

  function buildTwo(level) {
    const c  = CFG[level];
    const op = pick(ALL_OPS);
    let a, b, result;

    if (op === '+') {
      a = randInt(c.lo, c.hi);
      b = randInt(c.lo, c.hi);
      result = a + b;

    } else if (op === '-') {
      // Guarantee a > b so result > 0
      a = randInt(c.lo + 1, c.hi);
      b = randInt(c.lo, a - 1);
      result = a - b;

    } else if (op === '*') {
      a = randInt(2, c.mulMax);
      b = randInt(2, c.mulMax);
      result = a * b;

    } else { // '/'
      [a, b] = safeDivPair(c.divDivisor, c.divQuotient);
      result = a / b;
    }

    return {
      numbers:       [a, b],
      operations:    [op],          // the hidden op(s)
      revealedOps:   [],            // ops shown to player (none for easy/medium)
      hiddenOpIndex: 0,             // which gap the player must fill
      result,
    };
  }

  // ---- Three-number question (Hard) ----
  //
  // Structure: a  [op1 REVEALED]  b  [op2 HIDDEN]  c  =  result
  // Player sees op1 and must identify op2.

  function buildThree() {
    const c = CFG.hard;
    const MAX = 120;

    for (let attempt = 0; attempt < MAX; attempt++) {
      const op1 = pick(ALL_OPS); // will be revealed
      const op2 = pick(ALL_OPS); // player must guess this
      let a, b, c2, mid, result;

      try {
        // Compute a op1 b = mid
        if (op1 === '+') {
          a = randInt(c.lo, c.hi);
          b = randInt(c.lo, c.hi);
          mid = a + b;
        } else if (op1 === '-') {
          a = randInt(c.lo + 1, c.hi);
          b = randInt(c.lo, a - 1);
          mid = a - b;
        } else if (op1 === '*') {
          a = randInt(2, c.mulMax);
          b = randInt(2, c.mulMax);
          mid = a * b;
        } else {
          [a, b] = safeDivPair(c.divDivisor, c.divQuotient);
          mid = a / b;
        }

        if (!Number.isInteger(mid) || mid <= 0) continue;

        // Compute mid op2 c2 = result
        if (op2 === '+') {
          c2     = randInt(c.lo, c.hi);
          result = mid + c2;
        } else if (op2 === '-') {
          if (mid <= 1) continue;
          c2     = randInt(1, mid - 1);
          result = mid - c2;
        } else if (op2 === '*') {
          c2     = randInt(2, 6);
          result = mid * c2;
        } else {
          const divs = divisorsOf(mid, 10);
          if (!divs.length) continue;
          c2     = pick(divs);
          result = mid / c2;
        }

        if (!Number.isInteger(result) || result <= 0) continue;

        return {
          numbers:       [a, b, c2],
          operations:    [op2],       // only op2 is hidden / guessed
          revealedOps:   [op1],       // op1 is shown in the display
          hiddenOpIndex: 1,           // the second gap is hidden
          result,
        };

      } catch (_) { continue; }
    }

    // Fallback: simple addition with op1 revealed as '+'
    const a = randInt(3, 12);
    const b = randInt(3, 12);
    const c2 = randInt(3, 12);
    return {
      numbers:       [a, b, c2],
      operations:    ['+'],
      revealedOps:   ['+'],
      hiddenOpIndex: 1,
      result:        a + b + c2,
    };
  }

  // ---- Public API ----

  function generate(level) {
    return level === 'hard' ? buildThree() : buildTwo(level);
  }

  return { generate, OP_SYMBOL };
})();
