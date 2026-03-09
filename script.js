const screens = {
    landing: document.getElementById('landing-screen'),
    game: document.getElementById('game-screen'),
    end: document.getElementById('end-screen'),
    ad: document.getElementById('ad-screen')
};

const UI = {
    levelContainer: document.getElementById('level-container'),
    levelIndicator: document.getElementById('level-indicator'),
    timeLeft: document.getElementById('time-left'),
    timeBar: document.getElementById('time-bar'),
    bestLevel: document.getElementById('best-level'),
    failTitle: document.getElementById('fail-title'),
    reachedLevel: document.getElementById('reached-level'),
    globalStat: document.getElementById('global-stat'),
    failIcon: document.getElementById('fail-icon'),
    currentFailLevel: document.getElementById('current-fail-level'),
    adTimer: document.getElementById('ad-timer'),
    closeAdBtn: document.getElementById('close-ad-btn')
};

let currentLevelIndex = 0;
let timer = null;
let maxTime = 10;
let timeLeft = 10;
let isLevelActive = false;
let normalRetryCount = localStorage.getItem('aystti_retries') ? parseInt(localStorage.getItem('aystti_retries')) : 0;
let pendingAdAction = null;

function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[screenName].classList.add('active');
}

function updateBestLevel() {
    const best = localStorage.getItem('aystti_best') || 1;
    UI.bestLevel.textContent = best;
}

function setBestLevel(level) {
    const best = parseInt(localStorage.getItem('aystti_best') || 1);
    if (level > best) {
        localStorage.setItem('aystti_best', level);
    }
}

function startTimer(duration, onTick) {
    clearInterval(timer);
    maxTime = duration;
    timeLeft = duration;
    updateTimerUI();

    timer = setInterval(() => {
        timeLeft--;
        if (onTick) onTick(timeLeft);
        updateTimerUI();

        if (timeLeft <= 0) {
            clearInterval(timer);
            failLevel("Time's up!");
        }
    }, 1000);
}

function updateTimerUI() {
    UI.timeLeft.textContent = timeLeft;
    const pct = Math.max(0, (timeLeft / maxTime) * 100);
    UI.timeBar.style.width = `${pct}%`;

    if (timeLeft <= 3) {
        UI.timeLeft.style.color = 'var(--danger)';
        UI.timeBar.style.backgroundColor = 'var(--danger)';
    } else {
        UI.timeLeft.style.color = 'inherit';
        UI.timeBar.style.backgroundColor = 'var(--success)';
    }
}

function setTimeLeftOverride(newTime) {
    timeLeft = newTime;
    updateTimerUI();
}

function passLevel() {
    if (!isLevelActive) return;
    isLevelActive = false;
    clearInterval(timer);

    if (levels[currentLevelIndex].cleanup) {
        levels[currentLevelIndex].cleanup();
    }

    currentLevelIndex++;
    if (currentLevelIndex >= levels.length) {
        setBestLevel(currentLevelIndex + 1);
        showScreen('end');
        UI.failTitle.textContent = "You Win?!";
        UI.failTitle.style.color = "var(--success)";
        UI.failIcon.textContent = "🏆";
        UI.failIcon.style.animation = "none";
        UI.reachedLevel.textContent = "ALL";
        UI.globalStat.textContent = "0.01";
        return;
    }

    setBestLevel(currentLevelIndex + 1);

    UI.levelContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;animation: pulse-danger 0.5s;">
            <div style="font-size:4rem;margin-bottom:1rem;">✅</div>
            <h2 style="color:var(--success);font-size:2.5rem;font-weight:800;">Correct!</h2>
        </div>
    `;

    setTimeout(() => {
        loadLevel(currentLevelIndex);
    }, 1000);
}

function failLevel() {
    if (!isLevelActive) return;
    isLevelActive = false;
    clearInterval(timer);

    if (levels[currentLevelIndex].cleanup) {
        levels[currentLevelIndex].cleanup();
    }

    UI.levelContainer.style.pointerEvents = 'none';

    setTimeout(() => {
        showScreen('end');
        UI.failIcon.textContent = "❌";
        UI.failIcon.style.animation = "pulse-danger 2s infinite";
        UI.failTitle.textContent = "You Failed!";
        UI.failTitle.style.color = "var(--danger)";
        UI.reachedLevel.textContent = `Level ${currentLevelIndex + 1}`;

        let dropoff = Math.max(1, 100 - (currentLevelIndex * (100 / levels.length)));
        if (currentLevelIndex === 0) dropoff = 95;
        if (currentLevelIndex === levels.length - 1) dropoff = 3;
        UI.globalStat.textContent = Math.round(dropoff);
        UI.levelContainer.style.pointerEvents = 'all';
    }, 400);
}

const levels = [
    {
        time: 12,
        render: () => `
            <div class="question">What is 2 + 2?</div>
            <div class="options-grid" style="position: relative; height: 300px; display: block;">
                <button class="option-btn troll-wrong" style="display:inline-block; width: 45%; margin: 5px;">3</button>
                <button class="option-btn troll-wrong" style="display:inline-block; width: 45%; margin: 5px;">22</button>
                <button class="option-btn troll-wrong" style="display:inline-block; width: 45%; margin: 5px;">5</button>
                <button id="correct-btn" class="option-btn drift-anim" style="position: absolute; width: 45%; margin: 5px; z-index: 5;">4</button>
            </div>
        `,
        init: (container) => {
            container.querySelectorAll('.troll-wrong').forEach(btn => btn.onclick = () => failLevel());
            const correctBtn = container.querySelector('#correct-btn');
            correctBtn.onclick = () => passLevel();

            let x = 0; let y = 0;
            let vx = 3.5; let vy = 2.5; // pixel speed per frame

            levels[currentLevelIndex]._animFrame = requestAnimationFrame(function animate() {
                if (!isLevelActive) return;
                const maxX = container.clientWidth - correctBtn.clientWidth - 10;
                const maxY = 300 - correctBtn.clientHeight - 10;

                x += vx; y += vy;
                if (x <= 0 || x >= maxX) vx *= -1;
                if (y <= 0 || y >= maxY) vy *= -1;

                x = Math.max(0, Math.min(x, maxX));
                y = Math.max(0, Math.min(y, maxY));

                correctBtn.style.transform = `translate(${x}px, ${y}px)`;
                levels[currentLevelIndex]._animFrame = requestAnimationFrame(animate);
            });
        },
        cleanup: () => {
            cancelAnimationFrame(levels[currentLevelIndex]._animFrame);
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question" style="margin-bottom: 5px;">Select the smallest number</div>
            <div class="sub-text">written in words</div>
            <div class="options-grid">
                <button class="option-btn troll-wrong">3</button>
                <button class="option-btn troll-wrong">8</button>
                <button class="option-btn" id="correct-btn">five</button>
                <button class="option-btn troll-wrong">10</button>
            </div>
        `,
        init: (container) => {
            container.querySelectorAll('.troll-wrong').forEach(btn => btn.onclick = () => failLevel());
            container.querySelector('#correct-btn').onclick = () => passLevel();
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question">Tap the correct button to proceed.</div>
            <button class="huge-danger-btn">CORRECT</button>
            <div style="text-align: right; margin-top: 2rem; padding-right: 1rem;">
                <div id="real-correct" class="secret-dot"></div>
            </div>
        `,
        init: (container) => {
            container.querySelector('.huge-danger-btn').onclick = () => failLevel();
            container.querySelector('#real-correct').onclick = () => passLevel();
        }
    },
    {
        time: 6,
        render: () => `
            <div class="question" id="q-text">You have 6 seconds to tap this button.</div>
            <button id="correct-btn" class="btn btn-primary" style="margin-top:2rem;">Tap Me</button>
        `,
        init: (container) => {
            container.querySelector('#correct-btn').onclick = () => passLevel();
            levels[currentLevelIndex]._customTick = (t) => {
                if (t === 4) {
                    setTimeLeftOverride(1);
                    container.querySelector('#q-text').textContent = "HURRY!";
                    container.style.transform = 'scale(1.05)';
                    setTimeout(() => container.style.transform = 'none', 150);
                }
            };
        },
        cleanup: () => {
            levels[currentLevelIndex]._customTick = null;
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question">Select the <u style="color:var(--danger)">wrong</u> answer.</div>
            <div class="options-grid">
                <button class="option-btn troll-wrong">2 + 2 = 4</button>
                <button class="option-btn troll-wrong">5 - 3 = 2</button>
                <button class="option-btn" id="correct-btn">1 + 1 = 3</button>
                <button class="option-btn troll-wrong">10 / 2 = 5</button>
            </div>
        `,
        init: (container) => {
            container.querySelectorAll('.troll-wrong').forEach(btn => btn.onclick = () => failLevel());
            container.querySelector('#correct-btn').onclick = () => passLevel();
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question">Find and tap the Square</div>
            <div class="options-grid shape-grid" style="gap: 1.5rem;">
                <div class="option-btn shape-btn" data-type="circle">🔵</div>
                <div class="option-btn shape-btn" data-type="square">🟥</div>
                <div class="option-btn shape-btn" data-type="triangle">🔺</div>
                <div class="option-btn shape-btn" data-type="star">⭐</div>
            </div>
        `,
        init: (container) => {
            const shapes = container.querySelectorAll('.shape-btn');
            const icons = ['🔵', '🟥', '🔺', '⭐'];

            function shuffle() {
                for (let i = icons.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [icons[i], icons[j]] = [icons[j], icons[i]];
                }
                shapes.forEach((s, idx) => {
                    s.textContent = icons[idx];
                    s.dataset.current = icons[idx];
                });
            }

            levels[currentLevelIndex]._timer = setInterval(() => {
                if (isLevelActive) shuffle();
            }, 800);

            shapes.forEach(shape => {
                shape.onclick = () => {
                    if (shape.dataset.current === '🟥') passLevel();
                    else failLevel();
                };
            });
        },
        cleanup: () => clearInterval(levels[currentLevelIndex]._timer)
    },
    {
        time: 7,
        render: () => `
            <div class="question">Don't tap anything.</div>
            <button class="huge-danger-btn" style="background:var(--danger); animation: pulse-danger 0.8s infinite alternate;">TAP ME!</button>
        `,
        init: (container) => {
            levels[currentLevelIndex]._handler = (e) => {
                if (e.target.closest('#app')) {
                    failLevel();
                    document.removeEventListener('click', levels[currentLevelIndex]._handler);
                }
            };
            setTimeout(() => {
                document.addEventListener('click', levels[currentLevelIndex]._handler);
            }, 200);

            levels[currentLevelIndex]._customTick = (t) => {
                if (t === 0) {
                    passLevel();
                }
            };
        },
        cleanup: () => {
            document.removeEventListener('click', levels[currentLevelIndex]._handler);
            levels[currentLevelIndex]._customTick = null;
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question">Loading next level...</div>
            <div style="width:100%; height:24px; background:#e2e8f0; border-radius:12px; overflow:hidden; position:relative; margin-top: 2rem;">
                <div id="progress-bar-lvl8" style="width:0%; height:100%; background:var(--primary); transition:width 5s linear;"></div>
            </div>
            <div id="skip-btn" style="color:var(--text-muted); font-size:0.8rem; font-weight:700; cursor:pointer; margin-top:1rem; text-align:right; opacity:0.2; padding:0.5rem;">Skip</div>
        `,
        init: (container) => {
            setTimeout(() => {
                const bar = container.querySelector('#progress-bar-lvl8');
                if (bar) bar.style.width = '100%';
            }, 100);

            const to = setTimeout(() => {
                failLevel();
            }, 3500);

            const skipBtn = container.querySelector('#skip-btn');
            skipBtn.onclick = () => {
                clearTimeout(to);
                passLevel();
            };

            levels[currentLevelIndex]._to = to;
        },
        cleanup: () => {
            clearTimeout(levels[currentLevelIndex]._to);
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question">Tap the <span id="target-word" style="cursor:pointer; position:relative; z-index:10; border-bottom: 2px dashed #cbd5e1;">target</span> below</div>
            <div class="options-grid" style="margin-top: 2rem;">
                <button class="option-btn troll-wrong">Target A</button>
                <button class="option-btn troll-wrong">Target B</button>
                <button class="option-btn troll-wrong">Target C</button>
                <button class="option-btn troll-wrong">Target D</button>
            </div>
        `,
        init: (container) => {
            container.querySelectorAll('.troll-wrong').forEach(btn => btn.onclick = () => failLevel());
            container.querySelector('#target-word').onclick = () => passLevel();
        }
    },
    {
        time: 15,
        render: () => `
            <div class="question">Are you ready to win?</div>
            <button id="correct-btn" class="btn btn-primary" style="margin-bottom: 1rem;">Yes</button>
            <button id="wrong-btn" class="btn btn-secondary">No</button>
        `,
        init: (container) => {
            container.querySelector('#wrong-btn').onclick = () => failLevel();
            container.querySelector('#correct-btn').onclick = () => showConfirms();

            function showConfirms() {
                clearInterval(timer);
                const app = document.getElementById('app');

                let step = 0;
                const messages = [
                    "Are you completely sure?",
                    "Really? Have you double-checked?",
                    "Last chance. Proceed?"
                ];

                function showNextPopup() {
                    if (step >= messages.length) {
                        passLevel();
                        return;
                    }

                    const popup = document.createElement('div');
                    popup.className = 'screen active';
                    popup.style.background = 'rgba(15, 23, 42, 0.8)';
                    popup.style.backdropFilter = 'blur(5px)';
                    popup.style.zIndex = '999';

                    popup.innerHTML = `
                        <div style="background:var(--card-bg); padding:2.5rem 1.5rem; border-radius:24px; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.3); width: 100%; max-width: 400px; margin: auto;">
                            <p style="margin-bottom:2rem; font-size:1.4rem; font-weight:800;">${messages[step]}</p>
                            <div style="display:flex; flex-direction:column; gap:1rem;">
                                <button class="btn btn-primary yes-btn">Yes</button>
                                <button class="btn btn-secondary cancel-btn" style="margin:0;">No</button>
                            </div>
                        </div>
                    `;
                    app.appendChild(popup);

                    const yesBtn = popup.querySelector('.yes-btn');
                    const noBtn = popup.querySelector('.cancel-btn');

                    if (step === 1) {
                        yesBtn.textContent = "No";
                        noBtn.textContent = "Yes";

                        yesBtn.onclick = () => { popup.remove(); failLevel(); };
                        noBtn.onclick = () => { popup.remove(); showNextPopup(); step++; };
                    } else {
                        yesBtn.onclick = () => { popup.remove(); showNextPopup(); step++; };
                        noBtn.onclick = () => { popup.remove(); failLevel(); };
                    }
                }
                showNextPopup();
            }
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question">Hold the button for 3 seconds</div>
            <button id="hold-btn" class="huge-danger-btn" style="background:var(--primary);">HOLD</button>
            <div style="height:20px;width:100%;background:#e2e8f0;border-radius:10px;margin-top:20px;overflow:hidden;">
                <div id="hold-bar" style="height:100%;width:0%;background:var(--success);"></div>
            </div>
        `,
        init: (container) => {
            const btn = container.querySelector('#hold-btn');
            const bar = container.querySelector('#hold-bar');
            let holding = false;
            let progress = 0;

            levels[currentLevelIndex]._down = (e) => { e.preventDefault(); holding = true; };
            levels[currentLevelIndex]._up = () => { holding = false; progress = 0; bar.style.width = '0%'; };

            btn.addEventListener('touchstart', levels[currentLevelIndex]._down);
            btn.addEventListener('mousedown', levels[currentLevelIndex]._down);
            document.addEventListener('touchend', levels[currentLevelIndex]._up);
            document.addEventListener('mouseup', levels[currentLevelIndex]._up);

            levels[currentLevelIndex]._timer = setInterval(() => {
                if (holding) {
                    progress += 10;
                    bar.style.width = Math.min(100, (progress / 3000) * 100) + '%';
                    if (progress >= 3000) { passLevel(); }
                }
            }, 10);
        },
        cleanup: () => {
            clearInterval(levels[currentLevelIndex]._timer);
            document.removeEventListener('touchend', levels[currentLevelIndex]._up);
            document.removeEventListener('mouseup', levels[currentLevelIndex]._up);
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question" id="q-txt">What color is a banana?</div>
            <div class="options-grid" id="opt-container">
                <button class="option-btn troll-wrong">Red</button>
                <button class="option-btn troll-wrong">Blue</button>
                <button class="option-btn" id="correct-btn">Yellow</button>
                <button class="option-btn troll-wrong">Green</button>
            </div>
        `,
        init: (container) => {
            let state = 0;
            container.querySelectorAll('.troll-wrong').forEach(btn => btn.onclick = () => failLevel());
            container.querySelector('#correct-btn').onclick = function () {
                if (state === 0) {
                    state = 1;
                    container.querySelector('#q-txt').textContent = "Are you absolutely sure?";
                    const grid = container.querySelector('#opt-container');
                    grid.innerHTML = `
                        <button class="option-btn troll-wrong">Yes</button>
                        <button class="option-btn" id="real-yes">No, wait...</button>
                    `;
                    grid.style.gridTemplateColumns = "1fr 1fr";
                    grid.querySelector('.troll-wrong').onclick = () => failLevel();
                    grid.querySelector('#real-yes').onclick = () => passLevel();
                }
            };
        }
    },
    {
        time: 12,
        render: () => `
            <div class="question" id="mem-q">Memorize the middle shape</div>
            <div class="options-grid shape-grid" style="gap: 1rem; display:flex; justify-content:center;" id="mem-show">
                <div class="shape-btn">🔺</div>
                <div class="shape-btn" id="target-shape">⭐</div>
                <div class="shape-btn">🔵</div>
            </div>
            <div class="options-grid shape-grid" style="gap: 1rem; display:none; margin-top:2rem;" id="mem-ans">
                <button class="option-btn troll-wrong" style="font-size:2rem;">🔵</button>
                <button class="option-btn" id="correct-btn" style="font-size:2rem;">⭐</button>
                <button class="option-btn troll-wrong" style="font-size:2rem;">🔺</button>
            </div>
        `,
        init: (container) => {
            levels[currentLevelIndex]._to = setTimeout(() => {
                container.querySelector('#mem-q').textContent = "Which one was in the middle?";
                container.querySelector('#mem-show').style.display = 'none';
                container.querySelector('#mem-ans').style.display = 'grid';
            }, 3000);

            container.querySelectorAll('.troll-wrong').forEach(btn => btn.onclick = () => failLevel());
            container.querySelector('#correct-btn').onclick = () => {
                failLevel();
            };
            container.querySelector('#mem-q').innerHTML = 'Which one was in the <span id="mid-word" style="border-bottom:2px dashed #94a3b8;cursor:pointer;">middle</span>?';
            setTimeout(() => {
                const mid = container.querySelector('#mid-word');
                if (mid) mid.onclick = () => passLevel();
            }, 3010);
        },
        cleanup: () => clearTimeout(levels[currentLevelIndex]._to)
    },
    {
        time: 10,
        render: () => `
            <div class="question" id="dark-q">It's too bright in here.</div>
            <button class="huge-danger-btn" style="background:#fefce8; color:#0f172a;" id="light-switch">Turn off lights</button>
            <div id="hidden-pass" style="position:absolute; bottom:20px; left:20px; opacity:0.01; font-size:2rem; cursor:pointer; z-index:50;">🦉</div>
        `,
        init: (container) => {
            const app = document.getElementById('app');
            const btn = container.querySelector('#light-switch');
            const owl = container.querySelector('#hidden-pass');

            btn.onclick = () => {
                app.style.background = '#000';
                container.querySelector('#dark-q').style.color = '#fff';
                container.querySelector('#dark-q').textContent = "Find the creature of the night.";
                btn.style.display = 'none';
                owl.style.opacity = '1';
            };

            owl.onclick = () => {
                app.style.background = 'var(--card-bg)';
                passLevel();
            };
        },
        cleanup: () => {
            document.getElementById('app').style.background = 'var(--card-bg)';
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question">Tap the biggest <span id="word-circle" style="cursor:pointer; position:relative; z-index:10; display:inline-block; padding:5px;">circle</span></div>
            <div style="display:flex; justify-content:center; align-items:flex-end; gap:10px; height:200px;">
                <div class="troll-wrong" style="width:40px; height:40px; background:var(--primary); border-radius:50%; cursor:pointer;"></div>
                <div class="troll-wrong" style="width:80px; height:80px; background:var(--danger); border-radius:50%; cursor:pointer;"></div>
                <div class="troll-wrong" style="width:60px; height:60px; background:var(--success); border-radius:50%; cursor:pointer;"></div>
            </div>
        `,
        init: (container) => {
            container.querySelectorAll('.troll-wrong').forEach(btn => btn.onclick = () => failLevel());
            container.querySelector('#word-circle').onclick = () => passLevel();
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question">Stop the timer at 5.0</div>
            <div id="stopwatch" style="font-size:4rem; font-weight:900; text-align:center; margin:2rem 0; font-variant-numeric: tabular-nums;">10.0</div>
            <button id="stop-btn" class="btn btn-primary" style="font-size:1.5rem; padding:1.5rem;">STOP</button>
        `,
        init: (container) => {
            let t = 10.0;
            const watch = container.querySelector('#stopwatch');
            levels[currentLevelIndex]._sw = setInterval(() => {
                t -= 0.1;
                if (t <= 0) t = 0;
                watch.textContent = t.toFixed(1);
            }, 100);

            container.querySelector('#stop-btn').onclick = () => {
                clearInterval(levels[currentLevelIndex]._sw);
                if (t.toFixed(1) === "5.0") {
                    passLevel();
                } else {
                    failLevel();
                }
            };
        },
        cleanup: () => clearInterval(levels[currentLevelIndex]._sw)
    },
    {
        time: 10,
        render: () => `
            <div class="question">Type 100</div>
            <div id="display" style="background:#e2e8f0; padding:1rem; font-size:2rem; text-align:right; border-radius:12px; margin-bottom:1rem; height:4rem; font-weight:800;"></div>
            <div class="options-grid" style="grid-template-columns: repeat(3, 1fr); gap:10px;">
                <button class="option-btn num" data-val="1">1</button>
                <button class="option-btn num" data-val="2">2</button>
                <button class="option-btn num" data-val="3">3</button>
                <button class="option-btn num" data-val="4">4</button>
                <button class="option-btn num" data-val="5">5</button>
                <button class="option-btn num" data-val="6">6</button>
                <button class="option-btn num" data-val="7">7</button>
                <button class="option-btn num" data-val="8">8</button>
                <button class="option-btn num" data-val="9">9</button>
                <div></div>
                <button class="option-btn num" id="zero-btn" data-val="0">0</button>
                <div></div>
            </div>
        `,
        init: (container) => {
            const disp = container.querySelector('#display');
            let val = "";

            container.querySelectorAll('.num').forEach(btn => {
                btn.onclick = () => {
                    let v = btn.dataset.val;
                    if (v === "0") v = "8";
                    else if (v === "8") v = "0";

                    val += v;
                    disp.textContent = val;
                    if (val === "100") passLevel();
                    else if (val.length >= 3) failLevel();
                };
            });
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question">Find the letter <span id="real-x" style="cursor:pointer;position:relative;z-index:10;padding:5px;">X</span></div>
            <div style="font-size:3rem; font-weight:900; text-align:center; margin:2rem 0;">2x = 8</div>
            <div class="options-grid">
                <button class="option-btn troll-wrong">2</button>
                <button class="option-btn troll-wrong">4</button>
                <button class="option-btn troll-wrong">8</button>
                <button class="option-btn troll-wrong">x</button>
            </div>
        `,
        init: (container) => {
            container.querySelectorAll('.troll-wrong').forEach(btn => btn.onclick = () => failLevel());
            container.querySelector('#real-x').onclick = () => passLevel();
        }
    },
    {
        time: 10,
        render: () => `
            <div class="question">Tap in order: 1, 2, 3, 4</div>
            <div class="options-grid" id="seq-grid">
                <button class="option-btn seq" data-val="1">1</button>
                <button class="option-btn seq" data-val="2">2</button>
                <button class="option-btn seq" data-val="3">3</button>
                <button class="option-btn seq" data-val="4">4</button>
            </div>
        `,
        init: (container) => {
            let next = 1;
            const grid = container.querySelector('#seq-grid');
            container.querySelectorAll('.seq').forEach(btn => {
                btn.onclick = () => {
                    const val = parseInt(btn.dataset.val);
                    if (val === next) {
                        next++;
                        btn.style.background = 'var(--success)';
                        btn.style.color = 'white';
                        if (next > 4) passLevel();
                        else {
                            for (let i = grid.children.length; i >= 0; i--) {
                                grid.appendChild(grid.children[Math.random() * i | 0]);
                            }
                        }
                    } else {
                        failLevel();
                    }
                };
            });
        }
    },
    {
        time: 15,
        render: () => `
            <div class="question">What was the answer to Level 1?</div>
            <div class="options-grid">
                <button class="option-btn troll-wrong">3</button>
                <button class="option-btn troll-wrong">5</button>
                <button class="option-btn troll-wrong">22</button>
                <button class="option-btn troll-wrong">4</button>
            </div>
            <div id="finish-txt" style="font-size:0.8rem; color:var(--text-muted); opacity:0.3; text-align:center; margin-top:3rem; cursor:pointer; letter-spacing:1px; text-transform:uppercase;">Finish Test</div>
        `,
        init: (container) => {
            container.querySelectorAll('.troll-wrong').forEach(btn => btn.onclick = () => failLevel());
            container.querySelector('#finish-txt').onclick = () => passLevel();
        }
    }
];

function loadLevel(index) {
    if (index < 0 || index >= levels.length) return;

    currentLevelIndex = index;
    isLevelActive = true;
    const levelData = levels[index];

    UI.levelIndicator.textContent = 'Level ' + (index + 1);
    UI.levelContainer.innerHTML = levelData.render();

    levelData.init(UI.levelContainer);

    startTimer(levelData.time, (t) => {
        if (levelData._customTick) {
            levelData._customTick(t);
        }
    });
}

document.getElementById('start-btn').addEventListener('click', () => {
    showScreen('game');
    loadLevel(0);
});

document.getElementById('retry-btn').addEventListener('click', () => {
    normalRetryCount++;
    localStorage.setItem('aystti_retries', normalRetryCount);

    if (normalRetryCount >= 10) {
        normalRetryCount = 0;
        localStorage.setItem('aystti_retries', 0);
        showAdScreen(() => {
            showScreen('game');
            loadLevel(0);
        });
    } else {
        showScreen('game');
        loadLevel(0);
    }
});

// --- MONETIZATION POLICY NOTE ---
// To comply with Google AdSense and other ad network policies:
// 1. This "Watch Ad to Retry" button MUST trigger a specific "Rewarded Ad" or "Rewarded Interstitial" format.
// 2. You cannot use a standard display banner or standard interstitial here, as offering a reward 
//    (like continuing a level) for clicking or viewing standard ads is a policy violation.
// 3. Replace the 'showAdScreen' logic below with your ad network's Rewarded Ad SDK call.
document.getElementById('retry-ad-btn').addEventListener('click', () => {
    showAdScreen(() => {
        showScreen('game');
        loadLevel(currentLevelIndex); // restart same level
    });
});

// WhatsApp direct share
document.getElementById('whatsapp-btn').addEventListener('click', () => {
    const text = `🧠 I reached Level ${currentLevelIndex + 1} in "Are You Smarter Than The Internet?" Can you beat me?\n\n🔗 Play now: https://areyousmarterthaninternet.vercel.app`;
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
});

// General share (native share sheet or clipboard fallback)
document.getElementById('share-btn').addEventListener('click', async () => {
    const text = `🧠 I reached Level ${currentLevelIndex + 1} in "Are You Smarter Than The Internet?" Can you beat me?\n\n🔗 Play now: https://areyousmarterthaninternet.vercel.app`;
    const btn = document.getElementById('share-btn');

    if (navigator.share) {
        try {
            await navigator.share({
                title: 'Are You Smarter Than The Internet?',
                text: text,
                url: 'https://areyousmarterthaninternet.vercel.app'
            });
            btn.textContent = "Shared! ✅";
            setTimeout(() => btn.textContent = "Share", 2000);
        } catch (e) {
            if (e.name !== 'AbortError') {
                btn.textContent = "Share failed";
                setTimeout(() => btn.textContent = "Share", 2000);
            }
        }
    } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        btn.textContent = "Copied! 📋";
        setTimeout(() => btn.textContent = "Share", 2000);
    } else {
        alert(text);
    }
});

updateBestLevel();
