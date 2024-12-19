// ======================== 기본 GameObject 클래스 ========================
class GameObject {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.dead = false;
        this.type = "";
        this.width = 0;
        this.height = 0;
        this.img = undefined;
    }

    rectFromGameObject() {
        return {
            top: this.y,
            left: this.x,
            bottom: this.y + this.height,
            right: this.x + this.width,
        };
    }

    draw(ctx) {
        ctx.drawImage(this.img, this.x, this.y, this.width, this.height);
    }
}

// ======================== Hero 클래스 ========================
class Hero extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.width = 99;
        this.height = 75;
        this.type = 'Hero';
        this.cooldown = 0;
        this.life = 3;
        this.points = 0;
        this.shielded = false;
        this.shieldTimer = 0; 
    }

    canFire() {
        return this.cooldown === 0;
    }

    fire() {
        if (this.canFire()) {
            gameObjects.push(new Laser(this.x + this.width / 2 - 5, this.y - 10));
            this.cooldown = 500;
            let id = setInterval(() => {
                if (this.cooldown > 0) {
                    this.cooldown -= 100;
                } else {
                    clearInterval(id);
                }
            }, 100);
        }
    }

    decrementLife() {
        if (this.shielded) {
            return; // 실드 중 피해 없음
        }
        this.life--;
        if (this.life === 0) {
            this.dead = true;
        }
    }

    incrementPoints(value=100) {
        this.points += value;
    }

    updateShield() {
        if (this.shielded) {
            this.shieldTimer--;
            if (this.shieldTimer <= 0) {
                this.shielded = false;
            }
        }
    }

    draw(ctx) {
        super.draw(ctx);
        if (this.shielded) {
            const pad = 10;
            ctx.save();
            ctx.globalAlpha = 0.7;
            ctx.drawImage(shieldImg, this.x - pad, this.y - pad, this.width + pad*2, this.height + pad*2);
            ctx.restore();
        }
    }
}

// ======================== Enemy, Boss, Laser, EnemyLaser, ShieldItem 클래스 ========================
class Enemy extends GameObject {
    constructor(x, y, speed=5) {
        super(x, y);
        this.width = 98;
        this.height = 50;
        this.type = "Enemy";
        this.hp = 1;
        let id = setInterval(() => {
            if (this.y < canvas.height - this.height) {
                this.y += speed;
            } else {
                clearInterval(id);
            }
        }, 300);
    }
}

class Boss extends Enemy {
    constructor(x, y) {
        super(x, y, 2);
        this.width = 120;
        this.height = 120;
        this.type = "Boss";
        this.hp = 20;
        let fireId = setInterval(() => {
            if (this.dead) {
                clearInterval(fireId);
            } else {
                this.fire();
            }
        }, 1000);
    }

    fire() {
        gameObjects.push(new EnemyLaser(this.x + this.width/2 - 5, this.y + this.height));
    }
}

class Laser extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.width = 9;
        this.height = 33;
        this.type = 'Laser';
        this.img = laserImg;

        let id = setInterval(() => {
            if (this.y > 0) {
                this.y -= 15;
            } else {
                this.dead = true;
                clearInterval(id);
            }
        }, 100);
    }
}

class EnemyLaser extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.width = 9;
        this.height = 33;
        this.type = 'EnemyLaser';
        this.img = laserGreenImg;

        let id = setInterval(() => {
            if (this.y < canvas.height) {
                this.y += 10;
            } else {
                this.dead = true;
                clearInterval(id);
            }
        }, 100);
    }
}

class ShieldItem extends GameObject {
    constructor(x, y) {
        super(x, y);
        this.width = 30;
        this.height = 30;
        this.type = 'ShieldItem';
        this.img = shieldImg;

        let id = setInterval(() => {
            if (this.y < canvas.height - this.height) {
                this.y += 3;
            } else {
                this.dead = true;
                clearInterval(id);
            }
        }, 100);
    }
}

// ======================== Meteor 클래스 (광역기) ========================
class Meteor extends GameObject {
    constructor() {
        super(canvas.width/2 - 64, -128);
        this.width = 128;
        this.height = 128;
        this.type = 'Meteor';
        this.img = meteorBigImg;
        this.used = false; // 적 제거 여부
        this.frameCount = 0; // 사용 후 몇 프레임 동안 표시할지

        let id = setInterval(() => {
            if (this.y < canvas.height) {
                this.y += 20;
            } else {
                this.dead = true;
                clearInterval(id);
            }
        }, 100);
    }

    draw(ctx) {
        super.draw(ctx);
        if (!this.used && this.y > 0) {
            // 화면 진입 시 적 제거
            let hadEnemies = !isEnemiesDead();
            gameObjects.forEach((obj) => {
                if (obj.type === 'Enemy' || obj.type === 'Boss') {
                    obj.hp = 0; // 즉사
                }
            });

            if (hadEnemies && isEnemiesDead()) {
                // 적 모두 제거되었다면 3초 뒤 다음 스테이지
                setTimeout(() => {
                    nextStage();
                }, 3000);
            }
            this.used = true;
        } else if (this.used) {
            // 사용 후 3프레임 표시 후 사라짐
            this.frameCount++;
            if (this.frameCount > 3) {
                this.dead = true;
            }
        }
    }
}

// ======================== 이벤트 처리 ========================
class EventEmitter {
    constructor() {
        this.listeners = {};
    }

    on(message, listener) {
        if (!this.listeners[message]) {
            this.listeners[message] = [];
        }
        this.listeners[message].push(listener);
    }

    emit(message, payload = null) {
        if (this.listeners[message]) {
            this.listeners[message].forEach((l) => l(message, payload));
        }
    }

    clear() {
        this.listeners = {};
    }
}

const Messages = {
    KEY_EVENT_SPACE: "KEY_EVENT_SPACE",
    KEY_EVENT_ENTER: "KEY_EVENT_ENTER",
    KEY_EVENT_C: "KEY_EVENT_C",
    COLLISION_ENEMY_LASER: "COLLISION_ENEMY_LASER",
    COLLISION_ENEMY_HERO: "COLLISION_ENEMY_HERO",
    COLLISION_HERO_ENEMYLASER: "COLLISION_HERO_ENEMYLASER",
    COLLISION_HERO_SHIELD: "COLLISION_HERO_SHIELD",
    GAME_END_WIN: "GAME_END_WIN",
    GAME_END_LOSS: "GAME_END_LOSS",
    GAME_OVER: "GAME_OVER"
};

// ======================== 전역 변수 ========================
let heroImg, enemyImg, laserImg, lifeImg, explosionImg, backgroundImg, enemyUFOImg, 
    shieldImg, laserGreenImg, meteorBigImg,
    canvas, ctx, gameObjects = [], hero, eventEmitter = new EventEmitter(), gameLoopId;
let stage = 1;
let totalStages = 3;
let chargeMeter = 0; // 메테오 차지 게이지
let chargeMax = 500; // 만땅 시 C키로 메테오 사용

const keysDown = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false
};

// ======================== 유틸 함수 ========================
function loadTexture(path) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = path;
        img.onload = () => {
            resolve(img);
        };
    });
}

function isHeroDead() {
    return hero.life <= 0;
}

function isEnemiesDead() {
    const enemies = gameObjects.filter((go) => (go.type === "Enemy" || go.type === "Boss") && !go.dead);
    return enemies.length === 0;
}

function displayMessage(message, color = "red") {
    ctx.font = "30px Arial";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(message, canvas.width / 2, canvas.height / 2);
}

function endGame(win) {
    clearInterval(gameLoopId);
    setTimeout(() => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (win) {
            displayMessage(
                "Victory!!! Press [Enter] to start a new game",
                "green"
            );
        } else {
            displayMessage(
                "You died !!! Press [Enter] to start a new game"
            );
        }
    }, 200);
}

function resetGame() {
    if (gameLoopId) {
        clearInterval(gameLoopId);
        eventEmitter.clear();
        stage = 1;
        chargeMeter = 0;
        initGame();
        startGameLoop();
    }
}

// ======================== 로딩 완료 후 시작 ========================
window.onload = async () => {
    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d");
    heroImg = await loadTexture("assets/player.png");
    enemyImg = await loadTexture("assets/enemyShip.png");
    laserImg = await loadTexture("assets/laserRed.png");
    explosionImg = await loadTexture("assets/laserGreenShot.png");
    backgroundImg = await loadTexture("assets/starBackground.png");
    lifeImg = await loadTexture("assets/life.png");
    enemyUFOImg = await loadTexture("assets/enemyUFO.png");
    shieldImg = await loadTexture("assets/shield.png");
    laserGreenImg = await loadTexture("assets/laserGreen.png");
    meteorBigImg = await loadTexture("assets/meteorBig.png");

    initGame();
    startGameLoop();
    drawPoints();
    drawLife();
};

function startGameLoop() {
    gameLoopId = setInterval(() => {
        const bgPattern = ctx.createPattern(backgroundImg, 'repeat');
        ctx.fillStyle = bgPattern;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        updateGameObjects();
        drawGameObjects(ctx);
        drawUI();
    }, 100);
}

function initGame() {
    gameObjects = [];
    createEnemiesForStage(stage);
    createHero();
    initEvents();
}

function initEvents() {
    eventEmitter.on(Messages.KEY_EVENT_SPACE, () => {
        if (hero.canFire()) {
            hero.fire();
        }
    });

    eventEmitter.on(Messages.COLLISION_ENEMY_LASER, (_, { first, second }) => {
        second.hp -= 1;
        first.dead = true;
        if (second.hp <= 0) {
            second.dead = true;
            hero.incrementPoints();
            chargeMeter = Math.min(chargeMax, chargeMeter + 50);
            if (Math.random() < 0.2) {
                gameObjects.push(new ShieldItem(second.x, second.y));
            }
            if (isEnemiesDead()) {
                // 적 모두 제거 시 즉시 nextStage 호출하지 않고
                // Meteor 사용시에는 Meteor 내부에서 처리됨
                // 일반적으로 적을 제거했을 때는 즉시 nextStage 가능
                nextStage();
            }
        }
    });

    eventEmitter.on(Messages.COLLISION_ENEMY_HERO, (_, { enemy }) => {
        if (enemy.type === 'Boss') {
            enemy.hp -= 1; 
        } else {
            enemy.dead = true;
        }
        hero.decrementLife();
        if (isHeroDead()) {
            eventEmitter.emit(Messages.GAME_END_LOSS);
            return;
        }
        if (isEnemiesDead()) {
            eventEmitter.emit(Messages.GAME_END_WIN);
        }
    });

    eventEmitter.on(Messages.COLLISION_HERO_ENEMYLASER, (_, { laser }) => {
        laser.dead = true;
        hero.decrementLife();
        if (isHeroDead()) {
            eventEmitter.emit(Messages.GAME_END_LOSS);
        }
    });

    eventEmitter.on(Messages.COLLISION_HERO_SHIELD, (_, { shield }) => {
        shield.dead = true;
        hero.shielded = true;
        hero.shieldTimer = 50;
    });

    eventEmitter.on(Messages.GAME_END_WIN, () => {
        endGame(true);
    });

    eventEmitter.on(Messages.GAME_END_LOSS, () => {
        endGame(false);
    });

    eventEmitter.on(Messages.KEY_EVENT_ENTER, () => {
        resetGame();
    });

    eventEmitter.on(Messages.KEY_EVENT_C, () => {
        if (chargeMeter >= chargeMax) {
            gameObjects.push(new Meteor());
            chargeMeter = 0;
        }
    });
}

function nextStage() {
    stage++;
    if (stage > totalStages) {
        eventEmitter.emit(Messages.GAME_END_WIN);
    } else {
        createEnemiesForStage(stage);
    }
}

function createEnemiesForStage(stage) {
    if (stage < totalStages) {
        const MONSTER_TOTAL = 5;
        const MONSTER_WIDTH = MONSTER_TOTAL * 98;
        const START_X = (canvas.width - MONSTER_WIDTH) / 2;
        const STOP_X = START_X + MONSTER_WIDTH;

        for (let x = START_X; x < STOP_X; x += 98) {
            for (let y = 0; y < 50 * 2; y += 50) {
                const enemy = new Enemy(x, y);
                enemy.img = enemyImg;
                gameObjects.push(enemy);
            }
        }
    } else {
        const boss = new Boss(canvas.width/2 - 60, 50);
        boss.img = enemyUFOImg;
        gameObjects.push(boss);
    }
}

function createHero() {
    hero = new Hero(canvas.width / 2 - 45, canvas.height - canvas.height / 4);
    hero.img = heroImg;
    gameObjects.push(hero);
}

function drawGameObjects(ctx) {
    gameObjects.forEach(go => go.draw(ctx));
}

function drawLife() {
    const START_POS = canvas.width - 180;
    for(let i=0; i < hero.life; i++) {
        ctx.drawImage(lifeImg, START_POS + (45 * (i+1)), canvas.height - 37);
    }
}

function drawPoints() {
    ctx.font = "20px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "left";
    drawText("Points: " + hero.points, 10, canvas.height-20);
}

function drawStage() {
    ctx.font = "20px Arial";
    ctx.fillStyle = "yellow";
    ctx.textAlign = "center";
    drawText("Stage: " + stage, canvas.width/2, 30);
}

function drawChargeMeter() {
    const barWidth = 200;
    const barHeight = 20;
    const x = 10;
    const y = 10;
    ctx.strokeStyle = "white";
    ctx.strokeRect(x, y, barWidth, barHeight);
    const fillWidth = (chargeMeter / chargeMax) * barWidth;
    ctx.fillStyle = "green";
    ctx.fillRect(x, y, fillWidth, barHeight);

    ctx.font = "14px Arial";
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    drawText("Charge", x + barWidth/2, y + 15);
}

function drawUI() {
    drawPoints();
    drawLife();
    drawStage();
    drawChargeMeter();
}

function drawText(message, x, y) {
    ctx.fillText(message, x, y);
}

function intersectRect(r1, r2) {
    return !(r2.left > r1.right || r2.right < r1.left || r2.top > r1.bottom || r2.bottom < r1.top);
}

function updateGameObjects() {
    if (keysDown.ArrowUp) hero.y = Math.max(0, hero.y - 5);
    if (keysDown.ArrowDown) hero.y = Math.min(canvas.height - hero.height, hero.y + 5);
    if (keysDown.ArrowLeft) hero.x = Math.max(0, hero.x - 5);
    if (keysDown.ArrowRight) hero.x = Math.min(canvas.width - hero.width, hero.x + 5);

    const enemies = gameObjects.filter((go) => go.type === "Enemy" || go.type === "Boss");
    const lasers = gameObjects.filter((go) => go.type === "Laser");
    const enemyLasers = gameObjects.filter((go) => go.type === "EnemyLaser");
    const shieldItems = gameObjects.filter((go) => go.type === "ShieldItem");

    lasers.forEach((l) => {
        enemies.forEach((m) => {
            if (!l.dead && !m.dead && intersectRect(l.rectFromGameObject(), m.rectFromGameObject())) {
                eventEmitter.emit(Messages.COLLISION_ENEMY_LASER, { first: l, second: m });
            }
        });
    });

    enemies.forEach(enemy => {
        if (!hero.dead && !enemy.dead && intersectRect(hero.rectFromGameObject(), enemy.rectFromGameObject())) {
            eventEmitter.emit(Messages.COLLISION_ENEMY_HERO, { enemy });
        }
    });

    enemyLasers.forEach(laser => {
        if (!hero.dead && !laser.dead && intersectRect(hero.rectFromGameObject(), laser.rectFromGameObject())) {
            eventEmitter.emit(Messages.COLLISION_HERO_ENEMYLASER, { laser });
        }
    });

    shieldItems.forEach(item => {
        if (!hero.dead && !item.dead && intersectRect(hero.rectFromGameObject(), item.rectFromGameObject())) {
            eventEmitter.emit(Messages.COLLISION_HERO_SHIELD, { shield: item });
        }
    });

    gameObjects.forEach((obj) => {
        if ((obj.type === "Enemy" || obj.type === "Boss") && obj.hp <= 0) {
            obj.dead = true;
        }
    });

    hero.updateShield();
    gameObjects = gameObjects.filter((go) => !go.dead);
}

// 키 이벤트 처리
window.addEventListener('keydown', function(e) {
    if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        keysDown[e.key] = true;
    } else if (e.keyCode === 32) {
        eventEmitter.emit(Messages.KEY_EVENT_SPACE);
    } else if (e.key === "Enter") {
        eventEmitter.emit(Messages.KEY_EVENT_ENTER);
    } else if (e.key.toUpperCase() === "C") {
        eventEmitter.emit(Messages.KEY_EVENT_C);
    }
});

window.addEventListener("keyup", (evt) => {
    if (evt.key === "ArrowUp" || evt.key === "ArrowDown" || evt.key === "ArrowLeft" || evt.key === "ArrowRight") {
        keysDown[evt.key] = false;
    }
});