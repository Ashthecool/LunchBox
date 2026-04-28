var currentPage = '1'
var gameSketch = null
var currentChild = null   // { id, name, points }
var parentUID = null      // firebase auth uid

// Game settings (loaded from localStorage as fallback, or Firestore)
var gameSettings = {
    allowFruit: true,
    allowQuiz: true,
    defaultTopic: 'auto',   // 'auto' or topic key
    childPickTopic: true
}

// Quiz state
var quizState = null

// ─────────────────────────────────────────────
//  PAGE NAVIGATION
// ─────────────────────────────────────────────
function shiftPage(newPage) {
    document.querySelector('#page' + currentPage).classList.remove('show')
    currentPage = newPage
    setTimeout(function() {
        document.querySelector('#page' + currentPage).classList.add('show')
        if (newPage === '2') loadChildList()
        if (newPage === '3') startGame()
        if (newPage === '6') loadDashboard()
        if (newPage === '7') buildGamePicker()
        if (newPage === '8') buildTopicPicker()
        if (newPage === '9') buildQuiz()
    }, 600)
}

function ImmediateshiftPage(newPage) {
    document.querySelector('#page' + currentPage).classList.remove('show')
    currentPage = newPage
    document.querySelector('#page' + currentPage).classList.add('show')
}

ImmediateshiftPage('1')

function playAgain() {
    // Go back to game picker
    shiftPage('7')
}

// ─────────────────────────────────────────────
//  FIREBASE HELPERS
// ─────────────────────────────────────────────
function getDB() { return (typeof db !== 'undefined') ? db : null }
function getAuth() { return (typeof auth !== 'undefined') ? auth : (typeof firebase !== 'undefined' ? firebase.auth() : null) }

// ─────────────────────────────────────────────
//  AUTH — listen for parent login state
// ─────────────────────────────────────────────
window.addEventListener('load', function() {
    var a = getAuth()
    if (!a) return
    a.onAuthStateChanged(function(user) {
        if (user) {
            parentUID = user.uid
            if (currentPage === '5') shiftPage('6')
        } else {
            parentUID = null
        }
    })
    loadGameSettingsLocal()
})

// ─────────────────────────────────────────────
//  PARENT AUTH
// ─────────────────────────────────────────────
function parentLogin() {
    var a = getAuth()
    if (!a) return alert('Firebase not ready')
    var email = document.getElementById('auth-email').value.trim()
    var pass  = document.getElementById('auth-password').value
    a.signInWithEmailAndPassword(email, pass)
        .then(function() { shiftPage('6') })
        .catch(function(e) { showAuthError(e.message) })
}

function parentSignup() {
    var a = getAuth()
    if (!a) return alert('Firebase not ready')
    var email = document.getElementById('auth-email').value.trim()
    var pass  = document.getElementById('auth-password').value
    a.createUserWithEmailAndPassword(email, pass)
        .then(function(cred) {
            parentUID = cred.user.uid
            shiftPage('6')
        })
        .catch(function(e) { showAuthError(e.message) })
}

function parentLogout() {
    var a = getAuth()
    if (a) a.signOut()
    parentUID = null
    shiftPage('1')
}

function cheatLogin() {
    parentUID = 'dev-cheat-uid'
    shiftPage('6')
}

function cheatChild() {
    currentChild = { id: 'dev-child-id', name: 'Dev Kid', points: 50 }
    shiftPage('7')
}

function showAuthError(msg) {
    var el = document.getElementById('auth-error')
    if (el) { el.textContent = msg; el.style.display = 'block' }
}

// ─────────────────────────────────────────────
//  GAME SETTINGS — save/load
// ─────────────────────────────────────────────
function loadGameSettingsLocal() {
    try {
        var s = JSON.parse(localStorage.getItem('lunchbox-settings') || 'null')
        if (s) gameSettings = s
    } catch(e) {}
}

function saveGameSettings() {
    gameSettings.allowFruit     = document.getElementById('allow-fruit').checked
    gameSettings.allowQuiz      = document.getElementById('allow-quiz').checked
    gameSettings.defaultTopic   = document.getElementById('default-topic').value
    gameSettings.childPickTopic = document.getElementById('child-pick-topic').checked

    try { localStorage.setItem('lunchbox-settings', JSON.stringify(gameSettings)) } catch(e) {}

    // Optionally save to Firestore too
    var d = getDB()
    if (d && parentUID) {
        d.collection('settings').doc(parentUID).set(gameSettings).catch(function(){})
    }
}

function loadGameSettingsFromDB() {
    var d = getDB()
    if (!d || !parentUID) return
    d.collection('settings').doc(parentUID).get().then(function(doc) {
        if (doc.exists) {
            gameSettings = doc.data()
            applySettingsToUI()
        }
    }).catch(function(){})
}

function applySettingsToUI() {
    var af = document.getElementById('allow-fruit')
    var aq = document.getElementById('allow-quiz')
    var dt = document.getElementById('default-topic')
    var cp = document.getElementById('child-pick-topic')
    if (af) af.checked = gameSettings.allowFruit !== false
    if (aq) aq.checked = gameSettings.allowQuiz  !== false
    if (dt) dt.value   = gameSettings.defaultTopic || 'auto'
    if (cp) cp.checked = gameSettings.childPickTopic !== false
}

// ─────────────────────────────────────────────
//  PAGE 2 — Child selector
// ─────────────────────────────────────────────
function loadChildList() {
    var d = getDB()
    if (!d) return
    var container = document.getElementById('child-list')
    container.innerHTML = '<p>Loading...</p>'

    d.collection('children').orderBy('name').get().then(function(snap) {
        container.innerHTML = ''
        if (snap.empty) {
            container.innerHTML = '<p class="hint">No children yet — ask a parent to add you!</p>'
            return
        }
        snap.forEach(function(doc) {
            var data = doc.data()
            var btn = document.createElement('button')
            btn.className = 'child-btn'
            btn.innerHTML = '<span class="child-name">' + data.name + '</span><span class="child-pts">' + (data.points || 0) + ' pts</span>'
            btn.onclick = function() {
                currentChild = { id: doc.id, name: data.name, points: data.points || 0 }
                shiftPage('7')
            }
            container.appendChild(btn)
        })
    }).catch(function(e) {
        container.innerHTML = '<p class="hint">Error: ' + e.message + '</p>'
    })
}

// ─────────────────────────────────────────────
//  PAGE 7 — Game Picker
// ─────────────────────────────────────────────
function buildGamePicker() {
    var greeting = document.getElementById('game-picker-greeting')
    if (greeting && currentChild) greeting.textContent = 'What do you want to play, ' + currentChild.name + '? 🎮'

    var fruitCard = document.getElementById('game-card-fruit')
    var quizCard  = document.getElementById('game-card-quiz')

    if (fruitCard) fruitCard.classList.toggle('disabled', !gameSettings.allowFruit)
    if (quizCard)  quizCard.classList.toggle('disabled',  !gameSettings.allowQuiz)
}

function selectGame(type) {
    if (type === 'fruit') {
        shiftPage('3')
    } else if (type === 'quiz') {
        // If parent locked to a specific topic and child can't pick → skip topic screen
        if (!gameSettings.childPickTopic && gameSettings.defaultTopic !== 'auto') {
            quizState = { topic: gameSettings.defaultTopic }
            shiftPage('9')
        } else {
            shiftPage('8')
        }
    }
}

// ─────────────────────────────────────────────
//  PAGE 8 — Topic Picker
// ─────────────────────────────────────────────
var TOPICS = {
    animals:    { label: 'Animals',         emoji: '🦁' },
    science:    { label: 'Science',         emoji: '🧪' },
    geography:  { label: 'Geography',       emoji: '🗺️' },
    food:       { label: 'Food',            emoji: '🍔' },
    sports:     { label: 'Sports',          emoji: '🏆' },
    math:       { label: 'Math',            emoji: '➕' },
    english:    { label: 'English',         emoji: '✏️' },
    literature: { label: 'Literature',      emoji: '📖' },
    fantasy:    { label: 'Fantasy',         emoji: '🐉' },
    languages:  { label: 'Other Languages', emoji: '💬' }
}

function buildTopicPicker() {
    var grid = document.getElementById('topic-grid')
    if (!grid) return
    grid.innerHTML = ''

    // Surprise me button
    var surpriseBtn = document.createElement('button')
    surpriseBtn.className = 'topic-btn surprise'
    surpriseBtn.innerHTML = '<span class="topic-emoji">🎲</span><span class="topic-label">Surprise Me!</span>'
    surpriseBtn.onclick = function() { startQuizWithTopic('auto') }
    grid.appendChild(surpriseBtn)

    var keys = Object.keys(TOPICS)

    // If parent locked to a topic, highlight it or only show it
    var locked = (!gameSettings.childPickTopic && gameSettings.defaultTopic !== 'auto')
        ? gameSettings.defaultTopic : null

    if (locked && TOPICS[locked]) {
        keys = [locked]
    }

    keys.forEach(function(key) {
        var t = TOPICS[key]
        var btn = document.createElement('button')
        btn.className = 'topic-btn'
        btn.innerHTML = '<span class="topic-emoji">' + t.emoji + '</span><span class="topic-label">' + t.label + '</span>'
        btn.onclick = function() { startQuizWithTopic(key) }
        grid.appendChild(btn)
    })
}

function startQuizWithTopic(topicKey) {
    if (topicKey === 'auto') {
        // Pick random topic, or use parent default if set
        var def = gameSettings.defaultTopic
        if (def && def !== 'auto' && TOPICS[def]) {
            topicKey = def
        } else {
            var keys = Object.keys(TOPICS)
            topicKey = keys[Math.floor(Math.random() * keys.length)]
        }
    }
    quizState = { topic: topicKey }
    shiftPage('9')
}

// ─────────────────────────────────────────────
//  PAGE 9 — Quiz Engine
// ─────────────────────────────────────────────
var QUESTIONS_URL = './questions.json'
var questionsCache = null

function loadQuestions(callback) {
    if (questionsCache) { callback(questionsCache); return }
    fetch(QUESTIONS_URL)
        .then(function(r) { return r.json() })
        .then(function(data) { questionsCache = data; callback(data) })
        .catch(function() {
            // Fallback minimal set if fetch fails
            callback({})
        })
}

function buildQuiz() {
    if (!quizState || !quizState.topic) return
    loadQuestions(function(allQ) {
        var topicData = allQ[quizState.topic]
        if (!topicData || !topicData.questions) {
            document.getElementById('quiz-wrap').innerHTML = '<p class="hint">Questions not found!</p>'
            return
        }

        // Pick 5 random questions from the 25
        var pool = topicData.questions.slice()
        shuffleArray(pool)
        var selected = pool.slice(0, 5)

        quizState.questions  = selected
        quizState.current    = 0
        quizState.score      = 0
        quizState.streak     = 0
        quizState.topicLabel = topicData.label || TOPICS[quizState.topic].label
        quizState.topicEmoji = TOPICS[quizState.topic] ? TOPICS[quizState.topic].emoji : '🧠'

        renderQuizQuestion()
    })
}

function renderQuizQuestion() {
    var wrap = document.getElementById('quiz-wrap')
    if (!wrap) return
    wrap.innerHTML = ''

    var qs    = quizState.questions
    var idx   = quizState.current
    var total = qs.length
    var q     = qs[idx]
    var pct   = Math.round((idx / total) * 100)

    // Header
    var header = document.createElement('div')
    header.className = 'quiz-header'
    header.innerHTML =
        '<span class="quiz-topic-badge">' + quizState.topicEmoji + ' ' + quizState.topicLabel + '</span>' +
        '<span class="quiz-progress">Q' + (idx + 1) + ' of ' + total + '</span>' +
        '<span class="quiz-score-badge">⭐ ' + quizState.score + ' pts</span>'
    wrap.appendChild(header)

    // Progress bar
    var barWrap = document.createElement('div')
    barWrap.className = 'quiz-progress-bar-wrap'
    var bar = document.createElement('div')
    bar.className = 'quiz-progress-bar'
    bar.style.width = pct + '%'
    barWrap.appendChild(bar)
    wrap.appendChild(barWrap)

    // Streak
    var streakEl = document.createElement('div')
    streakEl.className = 'quiz-streak'
    if (quizState.streak >= 3) streakEl.textContent = '🔥 ' + quizState.streak + ' in a row!'
    wrap.appendChild(streakEl)

    // Question
    var qEl = document.createElement('div')
    qEl.className = 'quiz-question'
    qEl.textContent = q.q
    wrap.appendChild(qEl)

    // Options
    var optWrap = document.createElement('div')
    optWrap.className = 'quiz-options'
    var optLabels = ['A', 'B', 'C', 'D']
    q.options.forEach(function(opt, i) {
        var btn = document.createElement('button')
        btn.className = 'quiz-option'
        btn.textContent = optLabels[i] + '. ' + opt
        btn.onclick = function() { handleAnswer(i, q.a, optWrap, feedbackEl, nextBtn) }
        optWrap.appendChild(btn)
    })
    wrap.appendChild(optWrap)

    // Feedback
    var feedbackEl = document.createElement('div')
    feedbackEl.className = 'quiz-feedback'
    wrap.appendChild(feedbackEl)

    // Next button
    var nextBtn = document.createElement('button')
    nextBtn.className = 'quiz-next-btn'
    nextBtn.textContent = (idx + 1 < total) ? 'Next Question →' : 'See Results! 🎉'
    nextBtn.onclick = function() {
        quizState.current++
        if (quizState.current < quizState.questions.length) {
            renderQuizQuestion()
        } else {
            finishQuiz()
        }
    }
    wrap.appendChild(nextBtn)
}

function handleAnswer(chosen, correct, optWrap, feedbackEl, nextBtn) {
    var btns = optWrap.querySelectorAll('.quiz-option')
    btns.forEach(function(b) { b.disabled = true })

    if (chosen === correct) {
        btns[chosen].classList.add('correct')
        quizState.streak++
        var pts = quizState.streak >= 3 ? 2 : 1  // bonus point on hot streak
        quizState.score += pts
        feedbackEl.className = 'quiz-feedback correct'
        feedbackEl.textContent = quizState.streak >= 3
            ? '🔥 Correct! ×' + pts + ' pts (streak bonus!)'
            : '✅ Correct! +' + pts + ' pt'
    } else {
        btns[chosen].classList.add('wrong')
        btns[correct].classList.add('correct')
        quizState.streak = 0
        feedbackEl.className = 'quiz-feedback wrong'
        feedbackEl.textContent = '❌ Oops! The answer was: ' + quizState.questions[quizState.current].options[correct]
    }

    nextBtn.classList.add('visible')

    // Update score badge live
    var scoreBadge = document.querySelector('.quiz-score-badge')
    if (scoreBadge) scoreBadge.textContent = '⭐ ' + quizState.score + ' pts'

    // Update streak
    var streakEl = document.querySelector('.quiz-streak')
    if (streakEl) {
        if (quizState.streak >= 3) streakEl.textContent = '🔥 ' + quizState.streak + ' in a row!'
        else streakEl.textContent = ''
    }
}

function finishQuiz() {
    var score = quizState.score
    var total = quizState.questions.length
    var won   = score >= Math.ceil(total / 2)  // win if got at least half right
    shiftPage('4')
    setTimeout(function() { showEndScreen(won, score) }, 700)
}

function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1))
        var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
    }
}

// ─────────────────────────────────────────────
//  PAGE 4 — End screen + reward shop
// ─────────────────────────────────────────────
function showEndScreen(won, score) {
    var title   = document.getElementById('result-title')
    var scoreEl = document.getElementById('result-score')
    var totalEl = document.getElementById('result-total-points')
    var shop    = document.getElementById('reward-shop')

    if (title)   title.textContent   = won ? '🎉 You Survived!' : '💀 Game Over!'
    if (scoreEl) scoreEl.textContent = 'You earned ' + score + ' points this game!'

    if (currentChild && getDB()) {
        var newTotal = currentChild.points + score
        getDB().collection('children').doc(currentChild.id).update({ points: newTotal })
            .then(function() {
                currentChild.points = newTotal
                if (totalEl) totalEl.textContent = 'Total points: ' + newTotal + ' 🌟'
                loadRewardShop(shop, newTotal)
            })
    } else {
        if (totalEl) totalEl.textContent = ''
        if (shop) shop.innerHTML = '<p class="hint">Select a child profile to save points & spend rewards!</p>'
    }
}

function loadRewardShop(container, totalPoints) {
    if (!container) return
    container.innerHTML = ''

    var d = getDB()
    if (!d) return

    d.collection('rewards').orderBy('cost').get().then(function(snap) {
        if (snap.empty) {
            container.innerHTML = '<p class="hint">No rewards yet — ask a parent to add some!</p>'
            return
        }
        var title = document.createElement('h2')
        title.textContent = '🛒 Reward Shop'
        container.appendChild(title)

        snap.forEach(function(doc) {
            var r = doc.data()
            var card = document.createElement('div')
            card.className = 'reward-card' + (totalPoints >= r.cost ? '' : ' locked')
            card.innerHTML =
                '<span class="reward-name">' + r.name + '</span>' +
                '<span class="reward-cost">' + r.cost + ' pts</span>' +
                (totalPoints >= r.cost
                    ? '<button class="redeem-btn" onclick="redeemReward(\'' + doc.id + '\',\'' + r.name + '\',' + r.cost + ')">Redeem!</button>'
                    : '<span class="reward-locked">🔒 Need ' + (r.cost - totalPoints) + ' more</span>')
            container.appendChild(card)
        })
    })
}

function redeemReward(rewardId, name, cost) {
    if (!currentChild) return
    var d = getDB()
    if (!d) return
    if (currentChild.points < cost) return alert("Not enough points!")

    var newPts = currentChild.points - cost
    d.collection('children').doc(currentChild.id).update({ points: newPts }).then(function() {
        currentChild.points = newPts
        alert('🎉 Redeemed: ' + name + '!\nShow this to your parent.')
        var shop = document.getElementById('reward-shop')
        var totalEl = document.getElementById('result-total-points')
        if (totalEl) totalEl.textContent = 'Total points: ' + newPts + ' 🌟'
        loadRewardShop(shop, newPts)
    })
}

// ─────────────────────────────────────────────
//  PAGE 6 — Parent dashboard
// ─────────────────────────────────────────────
function loadDashboard() {
    if (!parentUID) { shiftPage('5'); return }
    loadDashChildren()
    loadDashRewards()
    loadGameSettingsFromDB()
    applySettingsToUI()
}

function loadDashChildren() {
    var d = getDB()
    if (!d) return
    var container = document.getElementById('dash-children')
    container.innerHTML = 'Loading...'

    d.collection('children').where('parentUID', '==', parentUID).orderBy('name').get()
        .then(function(snap) {
            container.innerHTML = ''
            if (snap.empty) {
                container.innerHTML = '<p class="hint">No children yet.</p>'
                return
            }
            snap.forEach(function(doc) {
                var c = doc.data()
                var row = document.createElement('div')
                row.className = 'dash-row'
                row.innerHTML =
                    '<span class="dash-name">👦 ' + c.name + '</span>' +
                    '<span class="dash-pts">' + (c.points || 0) + ' pts</span>' +
                    '<button class="small-btn" onclick="resetPoints(\'' + doc.id + '\')">Reset pts</button>' +
                    '<button class="small-btn danger" onclick="deleteChild(\'' + doc.id + '\')">Remove</button>'
                container.appendChild(row)
            })
        })
}

function loadDashRewards() {
    var d = getDB()
    if (!d) return
    var container = document.getElementById('dash-rewards')
    container.innerHTML = 'Loading...'

    d.collection('rewards').where('parentUID', '==', parentUID).orderBy('cost').get()
        .then(function(snap) {
            container.innerHTML = ''
            if (snap.empty) {
                container.innerHTML = '<p class="hint">No rewards yet.</p>'
                return
            }
            snap.forEach(function(doc) {
                var r = doc.data()
                var row = document.createElement('div')
                row.className = 'dash-row'
                row.innerHTML =
                    '<span class="dash-name">🎁 ' + r.name + '</span>' +
                    '<span class="dash-pts">' + r.cost + ' pts</span>' +
                    '<button class="small-btn danger" onclick="deleteReward(\'' + doc.id + '\')">Delete</button>'
                container.appendChild(row)
            })
        })
}

function addChild() {
    var d = getDB()
    if (!d || !parentUID) return
    var name = document.getElementById('new-child-name').value.trim()
    if (!name) return alert('Enter a name!')
    d.collection('children').add({ name: name, points: 0, parentUID: parentUID })
        .then(function() {
            document.getElementById('new-child-name').value = ''
            loadDashChildren()
        })
}

function addReward() {
    var d = getDB()
    if (!d || !parentUID) return
    var name = document.getElementById('new-reward-name').value.trim()
    var cost = parseInt(document.getElementById('new-reward-cost').value)
    if (!name) return alert('Enter a reward name!')
    if (!cost || cost < 1) return alert('Enter a valid point cost!')
    d.collection('rewards').add({ name: name, cost: cost, parentUID: parentUID })
        .then(function() {
            document.getElementById('new-reward-name').value = ''
            document.getElementById('new-reward-cost').value = ''
            loadDashRewards()
        })
}

function resetPoints(childId) {
    var d = getDB()
    if (!d) return
    if (!confirm('Reset points to 0?')) return
    d.collection('children').doc(childId).update({ points: 0 }).then(loadDashChildren)
}

function deleteChild(childId) {
    var d = getDB()
    if (!d) return
    if (!confirm('Remove this child?')) return
    d.collection('children').doc(childId).delete().then(loadDashChildren)
}

function deleteReward(rewardId) {
    var d = getDB()
    if (!d) return
    if (!confirm('Delete this reward?')) return
    d.collection('rewards').doc(rewardId).delete().then(loadDashRewards)
}

// ─────────────────────────────────────────────
//  FRUIT CATCHER GAME (p5 instance mode)
// ─────────────────────────────────────────────
function startGame() {
    if (gameSketch) { gameSketch.remove(); gameSketch = null }

    var sketch = function(p) {
        var GAME_DURATION = 60
        var FOODS  = ['🍎','🍊','🍋','🍇','🍓','🍑','🥝','🍍','🥦','🥕']
        var ROTTEN = ['🤢','💀','🐛','🦠']
        var basket, items, score, lives, timeLeft, gameState, particles, combo, lastItemFrame, frameStart, ended

        p.setup = function() {
            var cnv = p.createCanvas(Math.min(window.innerWidth, 480), Math.min(window.innerHeight * 0.9, 580))
            cnv.parent('game-container')
            p.textFont('Arial')
            resetGame()
        }

        function resetGame() {
            basket = { x: p.width/2, w: 90, h: 18, speed: 7 }
            items = []; score = 0; lives = 3
            timeLeft = GAME_DURATION; gameState = 'playing'
            particles = []; combo = 0; lastItemFrame = 0
            frameStart = p.frameCount; ended = false
        }

        p.draw = function() {
            p.background(245, 240, 230)
            if (gameState !== 'playing') return

            var elapsed = p.frameCount - frameStart
            timeLeft = GAME_DURATION - Math.floor(elapsed / 60)
            if (timeLeft <= 0 && !ended) { ended = true; endGame(true); return }

            var progress = 1 - (timeLeft / GAME_DURATION)
            var spawnInterval = Math.max(22, 75 - progress * 50)
            var fallSpeed = 2.5 + progress * 3.8

            if (elapsed - lastItemFrame > spawnInterval) {
                lastItemFrame = elapsed
                var isRotten = p.random() < 0.18 + progress * 0.15
                items.push({
                    x: p.random(30, p.width - 30), y: -30,
                    emoji: isRotten ? p.random(ROTTEN) : p.random(FOODS),
                    speed: fallSpeed + p.random(-0.5, 0.5),
                    rotten: isRotten, wobble: p.random(1000)
                })
            }

            if (p.keyIsDown(p.LEFT_ARROW)  || p.keyIsDown(65)) basket.x -= basket.speed
            if (p.keyIsDown(p.RIGHT_ARROW) || p.keyIsDown(68)) basket.x += basket.speed
            basket.x = p.constrain(basket.x, basket.w/2, p.width - basket.w/2)
            if (p.mouseIsPressed && p.mouseX > 0 && p.mouseX < p.width)
                basket.x = p.lerp(basket.x, p.mouseX, 0.25)

            p.noStroke()
            for (var y = 0; y < p.height; y += 60) { p.fill(235,228,215,80); p.rect(0,y,p.width,30) }

            p.textAlign(p.CENTER, p.CENTER)
            for (var i = items.length - 1; i >= 0; i--) {
                var item = items[i]
                item.y += item.speed
                item.x += Math.sin(elapsed * 0.04 + item.wobble) * 0.5

                var bTop = p.height - 58, bLeft = basket.x - basket.w/2 - 12, bRight = basket.x + basket.w/2 + 12
                if (item.y > bTop && item.y < bTop + 35 && item.x > bLeft && item.x < bRight) {
                    if (item.rotten) {
                        lives--; combo = 0
                        spawnParts(item.x, item.y, [220,60,60], 8)
                        if (lives <= 0 && !ended) { ended = true; endGame(false) }
                    } else {
                        combo++
                        score += combo >= 5 ? 3 : combo >= 3 ? 2 : 1
                        spawnParts(item.x, item.y, [60,200,100], 6)
                    }
                    items.splice(i, 1); continue
                }
                if (item.y > p.height + 20) {
                    if (!item.rotten) { combo = 0; lives--; if (lives <= 0 && !ended) { ended = true; endGame(false) } }
                    items.splice(i, 1); continue
                }
                p.textSize(30); p.text(item.emoji, item.x, item.y)
            }

            for (var j = particles.length - 1; j >= 0; j--) {
                var pt = particles[j]
                pt.x += pt.vx; pt.y += pt.vy; pt.vy += 0.22; pt.life -= 5
                if (pt.life <= 0) { particles.splice(j,1); continue }
                p.noStroke(); p.fill(pt.r,pt.g,pt.b,pt.life*2.5); p.circle(pt.x,pt.y,pt.life/10)
            }

            var bx = basket.x, by = p.height - 55
            p.fill(160,100,45); p.noStroke(); p.rect(bx-basket.w/2, by, basket.w, basket.h, 4)
            p.stroke(130,80,30); p.strokeWeight(1)
            for (var lx = bx-basket.w/2+10; lx < bx+basket.w/2; lx+=14) p.line(lx,by,lx,by+basket.h)
            p.stroke(140,90,40); p.strokeWeight(2); p.noFill()
            p.arc(bx, by+basket.h, basket.w+6, basket.h*2.5, 0, p.PI)

            p.noStroke(); p.fill(190,165,130); p.rect(0,p.height-18,p.width,18)
            drawHUD()
        }

        function drawHUD() {
            p.noStroke(); p.fill(200,185,165); p.rect(10,10,p.width-20,12,6)
            var ratio = timeLeft/GAME_DURATION
            p.fill(ratio>0.33 ? p.color(70,180,90) : p.color(210,60,55))
            p.rect(10,10,(p.width-20)*ratio,12,6)
            p.fill(55,40,25); p.noStroke(); p.textSize(19); p.textAlign(p.LEFT)
            p.text('Score: '+score, 12, 42)
            p.textAlign(p.CENTER); p.textSize(16); p.fill(80,60,40)
            p.text(timeLeft+'s', p.width/2, 42)
            p.textAlign(p.RIGHT); p.textSize(18)
            var hearts=''; for(var i=0;i<3;i++) hearts+=(i<lives?'❤️':'🖤')
            p.text(hearts, p.width-8, 42)
            if (combo>=3){ p.textAlign(p.CENTER); p.textSize(13); p.fill(200,120,0); p.text('🔥 COMBO x'+combo, p.width/2, 63) }
        }

        function spawnParts(x,y,rgb,n) {
            for(var i=0;i<n;i++) particles.push({x:x,y:y,vx:p.random(-3,3),vy:p.random(-5,-1),r:rgb[0],g:rgb[1],b:rgb[2],life:100})
        }

        function endGame(won) {
            gameState = 'ended'
            var finalScore = score
            setTimeout(function() {
                shiftPage('4')
                setTimeout(function() { showEndScreen(won, finalScore) }, 700)
            }, 800)
        }

        p.windowResized = function() {
            p.resizeCanvas(Math.min(window.innerWidth,480), Math.min(window.innerHeight*0.9,580))
        }
    }

    gameSketch = new p5(sketch)
}