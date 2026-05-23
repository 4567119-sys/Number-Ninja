/**
 * game.js — Number Ninja
 * -------------------------------------------------------
 * Core game logic: state, question flow, scoring,
 * timer, lives, streaks, coins, achievements,
 * leaderboard, and daily challenge.
 *
 * Load order: sounds.js → questions.js → ui.js → game.js
 * -------------------------------------------------------
 */

// ============================================================
// CONFIGURATION
// ============================================================

var CONFIG = {
  totalQuestions:       10,
  timerSeconds: {
    easy:   20,
    medium: 15,
    hard:   12,
  },
  maxLives:             3,
  pointsPerCorrect:     10,
  streakThreshold:      3,   // streak bonus kicks in at this count
  streakBonusPoints:    5,   // extra points per answer when on streak
  speedBonusPoints:     5,   // extra points for answering in first half of timer
  coinsPerCorrect:      2,
  coinsStreakBonus:     3,
  maxLeaderboardEntries:10,
};

// ============================================================
// ACHIEVEMENTS
// ============================================================

var ACHIEVEMENTS = [
  {
    id:    'first_correct',
    icon:  '🥷',
    label: 'First Strike',
    desc:  'Get your first correct answer',
    check: function(s) { return s.correctCount === 1; },
  },
  {
    id:    'streak_3',
    icon:  '🔥',
    label: 'On Fire',
    desc:  '3 correct answers in a row',
    check: function(s) { return s.currentStreak === 3; },
  },
  {
    id:    'streak_5',
    icon:  '⚡',
    label: 'Lightning Ninja',
    desc:  '5 correct answers in a row',
    check: function(s) { return s.currentStreak === 5; },
  },
  {
    id:    'streak_10',
    icon:  '🌪️',
    label: 'Whirlwind',
    desc:  '10 correct answers in a row',
    check: function(s) { return s.currentStreak === 10; },
  },
  {
    id:    'perfect_round',
    icon:  '🏆',
    label: 'Perfect Ninja',
    desc:  'Answer all 10 questions correctly',
    check: function(s) { return s.correctCount === CONFIG.totalQuestions; },
  },
  {
    id:    'speed_demon',
    icon:  '💨',
    label: 'Speed Demon',
    desc:  'Answer correctly with 10+ seconds remaining',
    check: function(s) { return s.lastAnswerCorrect && s.lastAnswerTime >= 10; },
  },
  {
    id:    'coin_collector',
    icon:  '🪙',
    label: 'Coin Collector',
    desc:  'Collect 30 coins in one round',
    check: function(s) { return s.coins >= 30; },
  },
  {
    id:    'hard_master',
    icon:  '⚔️',
    label: 'Ninja Master',
    desc:  'Complete a Hard mode round',
    check: function(s) { return s.level === 'hard' && s.roundComplete; },
  },
  {
    id:    'daily_done',
    icon:  '📅',
    label: 'Daily Ninja',
    desc:  'Complete the Daily Challenge',
    check: function(s) { return s.isDailyChallenge && s.roundComplete; },
  },
];

// ============================================================
// GAME STATE
// ============================================================

var state = {
  level:             'easy',
  score:             0,
  lives:             CONFIG.maxLives,
  coins:             0,
  currentStreak:     0,
  bestStreak:        0,
  correctCount:      0,
  questionIndex:     0,
  currentQuestion:   null,
  timerInterval:     null,
  timeRemaining:     0,
  isPaused:          false,
  isAnswered:        false,
  earnedBadges:      [],
  lastAnswerTime:    0,
  lastAnswerCorrect: false,
  roundComplete:     false,
  isDailyChallenge:  false,
};

// ============================================================
// PERSISTENCE HELPERS
// ============================================================

var highScore = parseInt(localStorage.getItem('nn_highscore') || '0', 10);

/** Load leaderboard array from localStorage */
function loadLeaderboard() {
  try {
    return JSON.parse(localStorage.getItem('nn_leaderboard') || '[]');
  } catch (_) { return []; }
}

/** Save a new score entry and keep top N */
function saveScore(score, level) {
  var board = loadLeaderboard();
  var now   = new Date();
  var dateStr = now.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
  board.push({ score: score, level: level, date: dateStr });
  board.sort(function(a, b) { return b.score - a.score; });
  board = board.slice(0, CONFIG.maxLeaderboardEntries);
  localStorage.setItem('nn_leaderboard', JSON.stringify(board));
  return board;
}

// ---- Daily Challenge ----

var DAILY_SEED_KEY  = 'nn_daily_seed';
var DAILY_DONE_KEY  = 'nn_daily_done';
var DAILY_SCORE_KEY = 'nn_daily_score';

/** Returns today's date string YYYY-MM-DD */
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function getDailyStatus() {
  var done  = localStorage.getItem(DAILY_DONE_KEY);
  var score = parseInt(localStorage.getItem(DAILY_SCORE_KEY) || '0', 10);
  return {
    completed: done === todayStr(),
    score:     score,
  };
}

function markDailyDone(score) {
  localStorage.setItem(DAILY_DONE_KEY,  todayStr());
  localStorage.setItem(DAILY_SCORE_KEY, score);
}

/**
 * Seeded pseudo-random number generator (Mulberry32).
 * Used so every player gets the same daily questions.
 */
function seededRng(seed) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ============================================================
// BOOT
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  // Show persisted high score
  document.getElementById('high-score-value').textContent = highScore;

  // Restore theme
  applyTheme(localStorage.getItem('nn_theme') || 'light');

  // Render leaderboard on start screen
  UI.renderLeaderboard(loadLeaderboard());

  // Daily challenge status
  UI.updateDailyChallengeBanner(getDailyStatus());

  bindEvents();
  UI.showScreen('start-screen');
});

// ============================================================
// EVENT BINDING
// ============================================================

function bindEvents() {

  // Difficulty buttons
  document.querySelectorAll('.diff-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.diff-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      state.level = btn.dataset.level;
      SoundManager.click();
    });
  });

  // Start game
  document.getElementById('start-btn').addEventListener('click', function() {
    SoundManager.click();
    state.isDailyChallenge = false;
    startGame();
  });

  // Daily challenge button
  var dailyBtn = document.getElementById('daily-btn');
  if (dailyBtn) {
    dailyBtn.addEventListener('click', function() {
      if (getDailyStatus().completed) return;
      SoundManager.click();
      state.isDailyChallenge = true;
      // Daily challenge always uses medium difficulty
      state.level = 'medium';
      document.querySelectorAll('.diff-btn').forEach(function(b) { b.classList.remove('active'); });
      var medBtn = document.querySelector('.diff-btn[data-level="medium"]');
      if (medBtn) medBtn.classList.add('active');
      startGame();
    });
  }

  // Operation answer buttons — use event delegation to avoid stale handlers
  document.getElementById('operations-grid').addEventListener('click', function(e) {
    var btn = e.target.closest('.op-btn');
    if (!btn || btn.disabled || state.isAnswered || state.isPaused) return;
    SoundManager.click();
    handleAnswer(btn.dataset.op);
  });

  // Next question — single listener, game.js controls the action
  document.getElementById('next-btn').addEventListener('click', function() {
    SoundManager.click();
    nextQuestion();
  });

  // Pause / Resume
  document.getElementById('pause-btn').addEventListener('click', function() {
    SoundManager.click();
    togglePause();
  });
  document.getElementById('resume-btn').addEventListener('click', function() {
    SoundManager.click();
    togglePause();
  });

  // Quit to menu
  document.getElementById('quit-btn').addEventListener('click', function() {
    SoundManager.click();
    quitToMenu();
  });

  // Results screen
  document.getElementById('play-again-btn').addEventListener('click', function() {
    SoundManager.click();
    state.isDailyChallenge = false;
    startGame();
  });
  document.getElementById('change-level-btn').addEventListener('click', function() {
    SoundManager.click();
    UI.showScreen('start-screen');
    UI.renderLeaderboard(loadLeaderboard());
    UI.updateDailyChallengeBanner(getDailyStatus());
  });

  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', function() {
    SoundManager.click();
    applyTheme(document.body.classList.contains('dark-mode') ? 'light' : 'dark');
  });

  // Leaderboard clear button
  var clearBtn = document.getElementById('clear-scores-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', function() {
      if (confirm('Clear all saved scores?')) {
        localStorage.removeItem('nn_leaderboard');
        localStorage.removeItem('nn_highscore');
        highScore = 0;
        document.getElementById('high-score-value').textContent = 0;
        UI.renderLeaderboard([]);
        SoundManager.click();
      }
    });
  }
}

// ============================================================
// THEME
// ============================================================

function applyTheme(theme) {
  document.body.classList.toggle('dark-mode', theme === 'dark');
  document.getElementById('theme-toggle').textContent = theme === 'dark' ? '☀️' : '🌙';
  localStorage.setItem('nn_theme', theme);
}

// ============================================================
// GAME FLOW
// ============================================================

function startGame() {
  // Reset state
  state.score             = 0;
  state.lives             = CONFIG.maxLives;
  state.coins             = 0;
  state.currentStreak     = 0;
  state.bestStreak        = 0;
  state.correctCount      = 0;
  state.questionIndex     = 0;
  state.earnedBadges      = [];
  state.isPaused          = false;
  state.isAnswered        = false;
  state.lastAnswerTime    = 0;
  state.lastAnswerCorrect = false;
  state.roundComplete     = false;
  state._forceEnd         = false;  // flag set when lives hit 0 mid-round

  // Clear achievements row
  document.getElementById('achievements-row').innerHTML = '';

  // Reset HUD
  UI.updateScore(0);
  UI.updateLives(CONFIG.maxLives, CONFIG.maxLives);
  UI.updateCoins(0);
  UI.setLevelBadge(state.level);
  UI.hideNewHighScore();
  UI.hidePause();
  UI.hideNextButton();

  // Daily challenge label
  var dcLabel = document.getElementById('daily-challenge-label');
  if (dcLabel) {
    dcLabel.classList.toggle('hidden', !state.isDailyChallenge);
  }

  UI.showScreen('game-screen');
  loadQuestion();
}

function loadQuestion() {
  clearTimer();
  UI.resetOpButtons();
  UI.hideFeedback();
  UI.hideNextButton();
  UI.hideStreakBanner();

  state.isAnswered        = false;
  state.lastAnswerCorrect = false;
  state.questionIndex++;

  state.currentQuestion = QuestionGenerator.generate(state.level);

  UI.renderQuestion(state.currentQuestion);
  UI.updateQuestionNumber(state.questionIndex, CONFIG.totalQuestions);

  // Show/hide hard mode hint
  UI.showHardHint(state.level === 'hard');

  startTimer();
}

function nextQuestion() {
  // _forceEnd is set when lives ran out mid-round
  if (state._forceEnd || state.questionIndex >= CONFIG.totalQuestions) {
    endGame();
  } else {
    loadQuestion();
  }
}

function endGame() {
  clearTimer();

  state.roundComplete = true;
  checkAchievements();

  SoundManager.gameOver();

  // Save to leaderboard
  var board = saveScore(state.score, state.level);
  UI.renderLeaderboard(board);

  // Update high score
  if (state.score > highScore) {
    highScore = state.score;
    localStorage.setItem('nn_highscore', highScore);
    document.getElementById('high-score-value').textContent = highScore;
    UI.showNewHighScore();
  } else {
    UI.hideNewHighScore();
  }

  // Mark daily challenge complete
  if (state.isDailyChallenge) {
    markDailyDone(state.score);
    UI.updateDailyChallengeBanner(getDailyStatus());
  }

  UI.showResults({
    score:          state.score,
    correct:        state.correctCount,
    streak:         state.bestStreak,
    coins:          state.coins,
    totalQuestions: CONFIG.totalQuestions,
  });

  UI.showResultsBadges(state.earnedBadges);

  // Confetti for 70%+ correct
  if (state.correctCount >= Math.ceil(CONFIG.totalQuestions * 0.7)) {
    UI.burstConfetti(state.correctCount === CONFIG.totalQuestions ? 80 : 40);
  }

  UI.showScreen('results-screen');
}

// ============================================================
// ANSWER HANDLING
// ============================================================

function handleAnswer(chosenOp) {
  if (state.isAnswered) return;
  state.isAnswered = true;

  clearTimer();
  UI.disableOpButtons();

  // The hidden operation is always operations[0]
  var correctOp = state.currentQuestion.operations[0];
  var isCorrect = (chosenOp === correctOp);

  state.lastAnswerTime    = state.timeRemaining;
  state.lastAnswerCorrect = isCorrect;

  UI.highlightAnswer(chosenOp, correctOp);
  UI.revealOperations(state.currentQuestion.operations);

  if (isCorrect) {
    processCorrect();
  } else {
    processWrong();
  }

  checkAchievements();

  // If lives ran out, flag for end-game on next click
  if (state.lives <= 0) {
    state._forceEnd = true;
    UI.showNextButton('📊 See Results');
  } else {
    UI.showNextButton();
  }
}

function processCorrect() {
  state.correctCount++;
  state.currentStreak++;
  if (state.currentStreak > state.bestStreak) {
    state.bestStreak = state.currentStreak;
  }

  var points = CONFIG.pointsPerCorrect;

  // Streak bonus
  if (state.currentStreak >= CONFIG.streakThreshold) {
    points += CONFIG.streakBonusPoints;
    SoundManager.streak();
    UI.showStreakBanner(state.currentStreak);
  } else {
    SoundManager.correct();
  }

  // Speed bonus: answered in the first half of the allowed time
  var totalTime = CONFIG.timerSeconds[state.level];
  if (state.lastAnswerTime > totalTime / 2) {
    points += CONFIG.speedBonusPoints;
  }

  state.score += points;
  UI.updateScore(state.score);

  // Coins
  var coins = CONFIG.coinsPerCorrect;
  if (state.currentStreak >= CONFIG.streakThreshold) coins += CONFIG.coinsStreakBonus;
  state.coins += coins;
  UI.updateCoins(state.coins);
  SoundManager.coin();

  UI.showFeedback(true, state.currentStreak);
}

function processWrong() {
  state.currentStreak = 0;
  state.lives = Math.max(0, state.lives - 1);
  UI.updateLives(state.lives, CONFIG.maxLives);
  SoundManager.wrong();
  UI.showFeedback(false, 0);
}

// ============================================================
// TIMER
// ============================================================

function startTimer() {
  var total = CONFIG.timerSeconds[state.level];
  state.timeRemaining = total;
  UI.resetTimer(total);

  state.timerInterval = setInterval(function() {
    if (state.isPaused) return;

    state.timeRemaining--;
    UI.updateTimer(state.timeRemaining, total);

    if (state.timeRemaining <= 0) {
      clearTimer();
      handleTimeUp();
      return;
    }

    // Sound cues
    if (state.timeRemaining <= 3) {
      SoundManager.urgentTick();
    } else if (state.timeRemaining % 5 === 0) {
      SoundManager.tick();
    }
  }, 1000);
}

function clearTimer() {
  if (state.timerInterval !== null) {
    clearInterval(state.timerInterval);
    state.timerInterval = null;
  }
}

function handleTimeUp() {
  if (state.isAnswered) return;
  state.isAnswered        = true;
  state.lastAnswerCorrect = false;

  UI.disableOpButtons();

  var correctOp = state.currentQuestion.operations[0];
  UI.highlightAnswer(null, correctOp);
  UI.revealOperations(state.currentQuestion.operations);

  state.currentStreak = 0;
  state.lives = Math.max(0, state.lives - 1);
  UI.updateLives(state.lives, CONFIG.maxLives);
  SoundManager.wrong();

  // Show time-up message directly (bypasses showFeedback)
  var fb = document.getElementById('feedback');
  fb.classList.remove('hidden', 'correct', 'wrong');
  fb.textContent = '⏰ Time\'s up! Answer: ' + opLabel(correctOp);
  fb.classList.add('wrong');

  if (state.lives <= 0) {
    state._forceEnd = true;
    UI.showNextButton('📊 See Results');
  } else {
    UI.showNextButton();
  }
}

function opLabel(op) {
  return ({ '+': 'Addition (+)', '-': 'Subtraction (−)', '*': 'Multiplication (×)', '/': 'Division (÷)' })[op] || op;
}

// ============================================================
// PAUSE
// ============================================================

function togglePause() {
  state.isPaused = !state.isPaused;
  state.isPaused ? UI.showPause() : UI.hidePause();
}

function quitToMenu() {
  clearTimer();
  state.isPaused = false;
  UI.hidePause();
  UI.renderLeaderboard(loadLeaderboard());
  UI.updateDailyChallengeBanner(getDailyStatus());
  UI.showScreen('start-screen');
}

// ============================================================
// ACHIEVEMENTS
// ============================================================

function checkAchievements() {
  ACHIEVEMENTS.forEach(function(a) {
    var already = state.earnedBadges.some(function(b) { return b.id === a.id; });
    if (already) return;
    if (a.check(state)) {
      state.earnedBadges.push(a);
      UI.addBadgeToRow(a.icon, a.label);
      UI.showToast(a.icon, a.label, a.desc);
      SoundManager.achievement();
    }
  });
}
