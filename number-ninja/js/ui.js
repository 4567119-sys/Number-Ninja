/**
 * ui.js — Number Ninja
 * -------------------------------------------------------
 * All DOM manipulation and visual effects.
 * Pure rendering — no game logic here.
 * -------------------------------------------------------
 */

const UI = (() => {

  // ============================================================
  // SCREEN MANAGEMENT
  // ============================================================

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const t = document.getElementById(id);
    if (t) t.classList.add('active');
  }

  // ============================================================
  // QUESTION RENDERING
  // ============================================================

  /**
   * Render the question chips into #question-display.
   *
   * Easy/Medium (hiddenOpIndex = 0):
   *   [a]  [?]  [b]  =  result
   *
   * Hard (hiddenOpIndex = 1, revealedOps = [op1]):
   *   [a]  [op1]  [b]  [?]  [c]  =  result
   *
   * @param {Object} question - from QuestionGenerator.generate()
   */
  function renderQuestion(question) {
    const display = document.getElementById('question-display');
    display.innerHTML = '';

    const { numbers, revealedOps, hiddenOpIndex } = question;
    const SYM = QuestionGenerator.OP_SYMBOL;

    numbers.forEach((num, i) => {
      // Number chip
      const chip = document.createElement('span');
      chip.className = 'number-chip';
      chip.textContent = num;
      chip.style.animationDelay = (i * 0.09) + 's';
      display.appendChild(chip);

      // Gap between numbers
      if (i < numbers.length - 1) {
        const opChip = document.createElement('span');
        opChip.className = 'op-chip';

        // Is this gap hidden (player must guess) or revealed?
        if (i === hiddenOpIndex) {
          opChip.textContent = '?';
          opChip.classList.add('op-hidden');
        } else {
          // Revealed op — show it (revealedOps[0] sits at gap index 0 for hard mode)
          const revealIdx = i < hiddenOpIndex ? i : i - 1;
          opChip.textContent = SYM[revealedOps[revealIdx]] || '?';
          opChip.classList.add('op-revealed');
        }

        opChip.style.animationDelay = (i * 0.09 + 0.05) + 's';
        display.appendChild(opChip);
      }
    });

    document.getElementById('result-value').textContent = question.result;
  }

  /**
   * After answering, replace the hidden "?" chip with the real operation symbol.
   * @param {string[]} operations - The hidden operation(s) that were guessed
   */
  function revealOperations(operations) {
    const SYM = QuestionGenerator.OP_SYMBOL;
    const hiddenChip = document.querySelector('.op-chip.op-hidden');
    if (hiddenChip && operations[0] !== undefined) {
      hiddenChip.textContent = SYM[operations[0]] || operations[0];
      hiddenChip.classList.remove('op-hidden');
      hiddenChip.classList.add('op-revealed');
    }
  }

  // ============================================================
  // OPERATION BUTTONS
  // ============================================================

  function resetOpButtons() {
    document.querySelectorAll('.op-btn').forEach(btn => {
      btn.classList.remove('correct-answer', 'wrong-answer');
      btn.disabled = false;
    });
  }

  function disableOpButtons() {
    document.querySelectorAll('.op-btn').forEach(btn => (btn.disabled = true));
  }

  /**
   * @param {string|null} chosenOp  - What the player picked (null = timed out)
   * @param {string}      correctOp - The actual correct operation
   */
  function highlightAnswer(chosenOp, correctOp) {
    document.querySelectorAll('.op-btn').forEach(btn => {
      const op = btn.dataset.op;
      if (op === correctOp) {
        btn.classList.add('correct-answer');
      } else if (chosenOp && op === chosenOp) {
        btn.classList.add('wrong-answer');
      }
    });
  }

  // ============================================================
  // FEEDBACK MESSAGES
  // ============================================================

  const CORRECT_MSGS = [
    "🎉 Correct! You're a Number Ninja!",
    '⚡ Awesome! Sharp as a blade!',
    '🥷 Ninja move! Spot on!',
    '🌟 Math genius at work!',
    '🔥 Blazing fast and correct!',
    '💥 Nailed it! Keep going!',
    "✨ Brilliant! You're on fire!",
  ];

  const WRONG_MSGS = [
    '❌ Not quite — keep training!',
    "💪 Almost! You'll get the next one!",
    '🎯 Every ninja learns from mistakes.',
    '🔄 Not this time — stay sharp!',
    '📚 Keep practising, Ninja!',
  ];

  const STREAK_MSGS = [
    "🔥 You're on a streak!",
    '⚡ Unstoppable! Awesome streak!',
    "🥷 You're becoming a Number Ninja!",
    '🌟 Math genius! Keep it up!',
    '💥 On fire! Nothing can stop you!',
  ];

  function showFeedback(isCorrect, streak) {
    streak = streak || 0;
    const el = document.getElementById('feedback');
    el.classList.remove('hidden', 'correct', 'wrong');

    if (isCorrect) {
      el.textContent = streak >= 3
        ? STREAK_MSGS[Math.min(streak - 3, STREAK_MSGS.length - 1)]
        : CORRECT_MSGS[Math.floor(Math.random() * CORRECT_MSGS.length)];
      el.classList.add('correct');
    } else {
      el.textContent = WRONG_MSGS[Math.floor(Math.random() * WRONG_MSGS.length)];
      el.classList.add('wrong');
    }
  }

  function hideFeedback() {
    const el = document.getElementById('feedback');
    el.classList.add('hidden');
    el.classList.remove('correct', 'wrong');
    el.textContent = '';
  }

  // ============================================================
  // HUD
  // ============================================================

  function updateScore(score) {
    const el = document.getElementById('score-display');
    el.textContent = score;
    // Restart pop animation
    el.classList.remove('score-pop');
    void el.offsetWidth;
    el.classList.add('score-pop');
  }

  /** Render lives as heart emojis */
  function updateLives(lives, max) {
    max = max || 3;
    const el = document.getElementById('lives-display');
    let html = '';
    for (let i = 0; i < max; i++) {
      html += i < lives ? '❤️' : '🖤';
    }
    el.innerHTML = html;
  }

  function updateCoins(coins) {
    document.getElementById('coins-display').textContent = coins;
  }

  function updateQuestionNumber(current, total) {
    total = total || 10;
    document.getElementById('q-number').textContent = current;

    // Update progress bar
    const bar = document.getElementById('progress-bar-fill');
    if (bar) bar.style.width = ((current - 1) / total * 100) + '%';
  }

  function setLevelBadge(level) {
    const badge = document.getElementById('level-badge');
    badge.textContent = level.charAt(0).toUpperCase() + level.slice(1);
    const colours = {
      easy:   'rgba(38,222,129,0.35)',
      medium: 'rgba(255,159,67,0.35)',
      hard:   'rgba(255,71,87,0.35)',
    };
    badge.style.background = colours[level] || 'rgba(255,255,255,0.2)';
  }

  // ============================================================
  // STREAK BANNER
  // ============================================================

  function showStreakBanner(count) {
    const banner = document.getElementById('streak-banner');
    document.getElementById('streak-count').textContent = count;
    banner.classList.remove('hidden');
    clearTimeout(banner._t);
    banner._t = setTimeout(() => banner.classList.add('hidden'), 2200);
  }

  function hideStreakBanner() {
    document.getElementById('streak-banner').classList.add('hidden');
  }

  // ============================================================
  // NEXT BUTTON
  // ============================================================

  function showNextButton(label) {
    const btn = document.getElementById('next-btn');
    btn.textContent = label || 'Next Question ➡';
    btn.classList.remove('hidden');
  }

  function hideNextButton() {
    const btn = document.getElementById('next-btn');
    btn.textContent = 'Next Question ➡';
    btn.classList.add('hidden');
  }

  // ============================================================
  // HARD MODE HINT
  // ============================================================

  function showHardHint(show) {
    const hint = document.getElementById('hard-hint');
    if (!hint) return;
    if (show) {
      hint.classList.remove('hidden');
    } else {
      hint.classList.add('hidden');
    }
  }

  // ============================================================
  // TIMER RING
  // ============================================================

  const CIRC = 2 * Math.PI * 34; // ≈ 213.63

  function updateTimer(remaining, total) {
    const circle = document.getElementById('timer-circle');
    const text   = document.getElementById('timer-text');
    if (!circle || !text) return;

    const frac = total > 0 ? Math.max(0, remaining / total) : 0;
    circle.style.strokeDashoffset = CIRC * (1 - frac);
    text.textContent = remaining;

    circle.classList.remove('warning', 'danger');
    if (frac <= 0.25)      circle.classList.add('danger');
    else if (frac <= 0.5)  circle.classList.add('warning');
  }

  function resetTimer(total) {
    updateTimer(total, total);
  }

  // ============================================================
  // RESULTS SCREEN
  // ============================================================

  function showResults({ score, correct, streak, coins, totalQuestions }) {
    document.getElementById('final-score').textContent   = score;
    document.getElementById('final-correct').textContent = correct + '/' + totalQuestions;
    document.getElementById('final-streak').textContent  = streak;
    document.getElementById('final-coins').textContent   = coins;

    const pct = totalQuestions > 0 ? correct / totalQuestions : 0;
    let emoji, title, message;

    if (pct === 1) {
      emoji   = '🏆';
      title   = 'Perfect Ninja!';
      message = 'Flawless! Every answer correct. You ARE the Number Ninja!';
    } else if (pct >= 0.8) {
      emoji   = '🥷';
      title   = 'Number Ninja!';
      message = 'Outstanding! Your math skills are razor-sharp!';
    } else if (pct >= 0.6) {
      emoji   = '⭐';
      title   = 'Great Job!';
      message = "Solid work! Keep training and you'll reach Ninja level soon!";
    } else if (pct >= 0.4) {
      emoji   = '💪';
      title   = 'Keep Training!';
      message = "Good effort! Every Ninja starts somewhere — keep practising!";
    } else {
      emoji   = '📚';
      title   = 'Keep Practising!';
      message = "Don't give up! Every mistake is a lesson. Try again!";
    }

    document.getElementById('results-emoji').textContent   = emoji;
    document.getElementById('results-title').textContent   = title;
    document.getElementById('results-message').textContent = message;
  }

  function showNewHighScore() {
    document.getElementById('new-high-score').classList.remove('hidden');
  }

  function hideNewHighScore() {
    document.getElementById('new-high-score').classList.add('hidden');
  }

  // ============================================================
  // LEADERBOARD
  // ============================================================

  /**
   * Render the top-scores list inside #leaderboard-list.
   * @param {Array} scores - Array of { score, level, date } objects (sorted desc)
   */
  function renderLeaderboard(scores) {
    const list = document.getElementById('leaderboard-list');
    if (!list) return;
    list.innerHTML = '';

    if (!scores || scores.length === 0) {
      list.innerHTML = '<li class="lb-empty">No scores yet — play a round!</li>';
      return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    scores.forEach((entry, i) => {
      const li = document.createElement('li');
      li.className = 'lb-entry' + (i === 0 ? ' lb-top' : '');
      li.innerHTML =
        '<span class="lb-rank">' + (medals[i] || (i + 1) + '.') + '</span>' +
        '<span class="lb-score">' + entry.score + ' pts</span>' +
        '<span class="lb-level lb-level-' + entry.level + '">' + entry.level + '</span>' +
        '<span class="lb-date">' + entry.date + '</span>';
      list.appendChild(li);
    });
  }

  // ============================================================
  // DAILY CHALLENGE BANNER
  // ============================================================

  /**
   * Show or update the daily challenge status banner.
   * @param {Object} status - { completed: bool, score: number, streak: number }
   */
  function updateDailyChallengeBanner(status) {
    const banner = document.getElementById('daily-banner');
    const btn    = document.getElementById('daily-btn');
    if (!banner || !btn) return;

    if (status.completed) {
      banner.textContent = '✅ Daily Challenge done! Score: ' + status.score;
      banner.classList.add('completed');
      btn.textContent  = '✅ Completed';
      btn.disabled     = true;
    } else {
      banner.textContent = '📅 Daily Challenge available!';
      banner.classList.remove('completed');
      btn.textContent  = '⚡ Play Daily';
      btn.disabled     = false;
    }
  }

  // ============================================================
  // IN-GAME BADGE ROW
  // ============================================================

  function addBadgeToRow(icon, label) {
    const row  = document.getElementById('achievements-row');
    if (!row) return;
    const chip = document.createElement('div');
    chip.className = 'badge-chip';
    chip.textContent = icon + ' ' + label;
    row.appendChild(chip);
  }

  // ============================================================
  // RESULTS BADGES
  // ============================================================

  function showResultsBadges(badges) {
    const container = document.getElementById('badges-earned');
    if (!container) return;
    container.innerHTML = '';
    (badges || []).forEach(b => {
      const chip = document.createElement('div');
      chip.className = 'badge-chip';
      chip.textContent = b.icon + ' ' + b.label;
      container.appendChild(chip);
    });
  }

  // ============================================================
  // ACHIEVEMENT TOAST
  // ============================================================

  let _toastTimer = null;

  function showToast(icon, title, desc) {
    const toast = document.getElementById('achievement-toast');
    if (!toast) return;
    document.getElementById('toast-icon').textContent  = icon;
    document.getElementById('toast-title').textContent = title;
    document.getElementById('toast-desc').textContent  = desc;

    toast.classList.remove('hidden');
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));

    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.classList.add('hidden'), 420);
    }, 3000);
  }

  // ============================================================
  // CONFETTI
  // ============================================================

  const CONFETTI_COLS = ['#6c63ff','#ff6b9d','#ff9f43','#26de81','#ffd32a','#45aaf2','#ff4757'];

  function burstConfetti(count) {
    count = count || 40;
    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-particle';
      p.style.left       = (Math.random() * 100) + 'vw';
      p.style.top        = '-20px';
      p.style.background = CONFETTI_COLS[Math.floor(Math.random() * CONFETTI_COLS.length)];
      const sz = Math.floor(Math.random() * 7) + 6;
      p.style.width  = sz + 'px';
      p.style.height = sz + 'px';
      p.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      const dur = Math.floor(Math.random() * 1400) + 1200;
      p.style.animationDuration = dur + 'ms';
      p.style.animationDelay    = (Math.random() * 500) + 'ms';
      document.body.appendChild(p);
      setTimeout(() => p.remove(), dur + 700);
    }
  }

  // ============================================================
  // PAUSE OVERLAY
  // ============================================================

  function showPause() {
    document.getElementById('pause-overlay').classList.remove('hidden');
  }

  function hidePause() {
    document.getElementById('pause-overlay').classList.add('hidden');
  }

  // ============================================================
  // PUBLIC API
  // ============================================================

  return {
    showScreen,
    renderQuestion,
    revealOperations,
    resetOpButtons,
    disableOpButtons,
    highlightAnswer,
    showFeedback,
    hideFeedback,
    updateScore,
    updateLives,
    updateCoins,
    updateQuestionNumber,
    setLevelBadge,
    showStreakBanner,
    hideStreakBanner,
    showNextButton,
    hideNextButton,
    showHardHint,
    updateTimer,
    resetTimer,
    showResults,
    showNewHighScore,
    hideNewHighScore,
    renderLeaderboard,
    updateDailyChallengeBanner,
    addBadgeToRow,
    showResultsBadges,
    showToast,
    burstConfetti,
    showPause,
    hidePause,
  };
})();
