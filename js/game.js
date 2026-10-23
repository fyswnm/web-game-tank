// Main Game Controller
import { sound } from './audio.js';
import { GameMap, TILE_SIZE, MAP_COLS, MAP_ROWS } from './map.js';
import { PlayerTank, EnemyTank, DIRECTION } from './tank.js';
import { ParticleSystem } from './particles.js';
import { PowerUp, BUFF_TYPE } from './powerup.js';
import { findPath } from './pathfinding.js';
import { TankPainter } from './paint.js';
import { VirtualJoystick } from './joystick.js';

export class TankGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // 逻辑分辨率 720 x 720 (15 x 15 格子，每格 48 像素)
        this.logicalWidth = MAP_COLS * TILE_SIZE;
        this.logicalHeight = MAP_ROWS * TILE_SIZE;
        this.canvas.width = this.logicalWidth;
        this.canvas.height = this.logicalHeight;

        this.gameMap = new GameMap();
        this.particles = new ParticleSystem();

        // 实体列表
        this.player = null;
        this.enemies = [];
        this.playerBullets = [];
        this.enemyBullets = [];
        this.powerUps = [];

        // 游戏状态
        this.score = 0;
        this.lives = 15;
        this.difficulty = 'normal'; // normal, hard, expert
        this.totalEnemiesToSpawn = 16;
        this.enemiesSpawned = 0;
        this.enemiesDefeated = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 3.5;
        this.isGameOver = false;
        this.isVictory = false;
        this.isPaused = false;

        // 手绘涂装管理器 (打开涂装时自动暂停，关闭时恢复)
        this.painter = new TankPainter(
            (skinCanvas, turretColor) => {
                if (this.player) {
                    this.player.customSkinCanvas = skinCanvas;
                    this.player.customTurretColor = turretColor;
                }
            },
            () => {
                this.setPaused(true);
            },
            () => {
                this.setPaused(false);
            }
        );

        this.lastTime = performance.now();

        this.initControls();
        this.startNewGame();
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    startNewGame() {
        this.gameMap.init();
        this.particles = new ParticleSystem();
        this.playerBullets = [];
        this.enemyBullets = [];
        this.powerUps = [];
        this.enemies = [];

        this.score = 0;
        this.lives = 15;
        this.enemiesSpawned = 0;
        this.enemiesDefeated = 0;
        this.totalEnemiesToSpawn = this.difficulty === 'expert' ? 20 : (this.difficulty === 'hard' ? 18 : 14);
        this.spawnInterval = this.difficulty === 'expert' ? 2.5 : (this.difficulty === 'hard' ? 3.0 : 3.8);
        this.spawnTimer = 1.0;

        this.isGameOver = false;
        this.isVictory = false;
        this.isPaused = false;

        // 初始化玩家坦克 (出生在老家左侧空地)
        this.spawnPlayer();

        this.updateUI();
        this.hideModals();
    }

    spawnPlayer() {
        const startX = 4 * TILE_SIZE + TILE_SIZE / 2;
        const startY = 14 * TILE_SIZE + TILE_SIZE / 2;
        this.player = new PlayerTank(startX, startY);
        if (this.painter) {
            if (this.painter.tankSkinCanvas) {
                this.player.customSkinCanvas = this.painter.tankSkinCanvas;
            }
            if (this.painter.turretColor) {
                this.player.customTurretColor = this.painter.turretColor;
            }
        }
        // 出生自带 3 秒护盾保护
        this.player.shieldTimer = 3.0;
    }

    initControls() {
        // 0. 虚拟摇杆 (左侧控制坦克行走与方向)
        this.joystick = new VirtualJoystick(
            'joystickContainer',
            'joystickKnob',
            (dir, intensity) => {
                sound.init();
                if (this.player && this.player.active && !this.isGameOver && !this.isVictory && !this.isPaused) {
                    this.player.setJoystickInput(dir);
                }
            },
            () => {
                if (this.player && this.player.active) {
                    this.player.setJoystickInput(null);
                }
            }
        );

        // 1. 点击/触控移动到相应位置 (完美适配手机与iPad)
        const handleCanvasPointer = (e) => {
            if (this.isGameOver || this.isVictory || this.isPaused) return;
            if (!this.player || !this.player.active) return;

            sound.init(); // 交互时恢复音频上下文

            const rect = this.canvas.getBoundingClientRect();
            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            const scaleX = this.logicalWidth / rect.width;
            const scaleY = this.logicalHeight / rect.height;
            const targetX = (clientX - rect.left) * scaleX;
            const targetY = (clientY - rect.top) * scaleY;

            // 寻路算法计算路径
            const path = findPath(this.player.x, this.player.y, targetX, targetY, this.gameMap);
            this.player.setPath(path, { x: targetX, y: targetY });
        };

        this.canvas.addEventListener('mousedown', (e) => {
            handleCanvasPointer(e);
        });

        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleCanvasPointer(e);
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            handleCanvasPointer(e);
        }, { passive: false });

        // 2. 移动端开炮按钮 (单指长按或连击快速开火)
        const fireBtn = document.getElementById('fireBtn');
        if (fireBtn) {
            const doFire = (e) => {
                if (e) e.preventDefault();
                sound.init();
                if (this.player && this.player.active && !this.isGameOver && !this.isVictory) {
                    this.player.shoot(this.playerBullets, sound);
                    if (navigator.vibrate) {
                        navigator.vibrate(20);
                    }
                }
            };

            fireBtn.addEventListener('touchstart', doFire, { passive: false });
            fireBtn.addEventListener('mousedown', doFire);
        }

        // 3. 键盘按键适配 (空格键开火，WASD/方向键严格网格移动，P/Esc 暂停)
        const keyDirs = {
            'KeyW': DIRECTION.UP, 'ArrowUp': DIRECTION.UP,
            'KeyS': DIRECTION.DOWN, 'ArrowDown': DIRECTION.DOWN,
            'KeyA': DIRECTION.LEFT, 'ArrowLeft': DIRECTION.LEFT,
            'KeyD': DIRECTION.RIGHT, 'ArrowRight': DIRECTION.RIGHT
        };

        window.addEventListener('keydown', (e) => {
            if (this.isGameOver || this.isVictory) return;

            sound.init();
            if (e.code === 'KeyP' || e.code === 'Escape') {
                e.preventDefault();
                this.togglePause();
                return;
            }

            if (this.isPaused) return;

            if (e.code === 'Space') {
                e.preventDefault();
                if (this.player && this.player.active) {
                    this.player.shoot(this.playerBullets, sound);
                }
            } else if (keyDirs[e.code] !== undefined) {
                e.preventDefault();
                if (this.player && this.player.active) {
                    this.player.setJoystickInput(keyDirs[e.code]);
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (keyDirs[e.code] !== undefined) {
                if (this.player && this.player.active) {
                    if (this.player.joystickDir === keyDirs[e.code]) {
                        this.player.setJoystickInput(null);
                    }
                }
            }
        });

        // 4. 难度切换按钮
        const diffSelect = document.getElementById('difficultySelect');
        if (diffSelect) {
            diffSelect.value = this.difficulty;
            diffSelect.addEventListener('change', (e) => {
                this.difficulty = e.target.value;
                this.startNewGame();
            });
        }

        // 5. 暂停按钮
        const pauseBtn = document.getElementById('pauseGameBtn');
        if (pauseBtn) {
            pauseBtn.onclick = () => {
                this.togglePause();
            };
        }

        const resumeBtn = document.getElementById('resumeGameBtn');
        if (resumeBtn) {
            resumeBtn.onclick = () => {
                this.setPaused(false);
            };
        }

        // 6. 涂装按钮
        const customSkinBtn = document.getElementById('customSkinBtn');
        if (customSkinBtn) {
            customSkinBtn.onclick = () => {
                this.painter.openModal();
            };
        }

        // 7. 重开按钮
        document.querySelectorAll('.restart-game-btn').forEach(btn => {
            btn.onclick = () => this.startNewGame();
        });
    }

    setPaused(paused) {
        if (this.isGameOver || this.isVictory) return;
        this.isPaused = paused;

        const pauseBtn = document.getElementById('pauseGameBtn');
        if (pauseBtn) {
            pauseBtn.innerHTML = this.isPaused ? '▶️ 继续' : '⏸️ 暂停';
            pauseBtn.classList.toggle('active', this.isPaused);
        }

        const pauseModal = document.getElementById('pauseModal');
        if (pauseModal) {
            // 若涂装弹窗处于打开状态，则不单独弹出暂停菜单
            const paintModal = document.getElementById('paintModal');
            const isPaintOpen = paintModal && paintModal.classList.contains('active');
            pauseModal.classList.toggle('active', this.isPaused && !isPaintOpen);
        }

        if (!this.isPaused) {
            this.lastTime = performance.now();
        }
    }

    togglePause() {
        this.setPaused(!this.isPaused);
    }

    manualMove(dir, dx, dy) {
        if (!this.player || !this.player.active) return;
        this.player.angle = dir;
        const targetX = this.player.x + dx;
        const targetY = this.player.y + dy;
        const col = Math.floor(targetX / TILE_SIZE);
        const row = Math.floor(targetY / TILE_SIZE);
        if (!this.gameMap.isBlockedForMovement(col, row)) {
            this.player.setPath([{ x: targetX, y: targetY }], { x: targetX, y: targetY });
        }
    }

    spawnEnemy() {
        if (this.enemiesSpawned >= this.totalEnemiesToSpawn) return;
        if (this.enemies.length >= 4) return; // 场上最多同时 4 辆敌军

        // 出生点：顶部左、中、右
        const spawnPoints = [
            { x: 1 * TILE_SIZE + TILE_SIZE / 2, y: 1 * TILE_SIZE + TILE_SIZE / 2 },
            { x: 7 * TILE_SIZE + TILE_SIZE / 2, y: 1 * TILE_SIZE + TILE_SIZE / 2 },
            { x: 13 * TILE_SIZE + TILE_SIZE / 2, y: 1 * TILE_SIZE + TILE_SIZE / 2 }
        ];

        // 过滤已被占用的出生点
        const available = spawnPoints.filter(pt => {
            return !this.enemies.some(e => Math.hypot(e.x - pt.x, e.y - pt.y) < TILE_SIZE);
        });

        if (available.length === 0) return;

        const pt = available[Math.floor(Math.random() * available.length)];
        const isCarrier = Math.random() < 0.35; // 35% 几率是发光道具载具

        const enemy = new EnemyTank(pt.x, pt.y, this.difficulty, isCarrier);
        this.enemies.push(enemy);
        this.enemiesSpawned++;

        // 闪光入场特效
        this.particles.createExplosion(pt.x, pt.y, '#ffffff', 8, 0.8);
    }

    update(dt) {
        if (this.isPaused || this.isGameOver || this.isVictory) return;

        // 1. 地图更新 (老家防御墙倒计时等)
        this.gameMap.update(dt);
        if (this.gameMap.baseDestroyed && !this.isGameOver) {
            this.triggerGameOver('老家被摧毁！');
            return;
        }

        // 2. 玩家更新
        if (this.player && this.player.active) {
            this.player.update(dt, this.gameMap);
        }

        // 3. 敌人生成与更新
        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            this.spawnEnemy();
            this.spawnTimer = this.spawnInterval;
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.updateAI(dt, this.gameMap, this.player, this.enemyBullets, sound);
            if (!enemy.active) {
                this.enemies.splice(i, 1);
            }
        }

        // 4. 子弹更新与碰撞检测
        this.updateBullets(dt);

        // 5. 道具掉落与拾取检测
        this.updatePowerUps(dt);

        // 6. 粒子更新
        this.particles.update(dt);

        // 7. 胜负检测
        if (this.enemiesDefeated >= this.totalEnemiesToSpawn && this.enemies.length === 0 && !this.isVictory) {
            this.triggerVictory();
        }

        this.updateUI();
    }

    updateBullets(dt) {
        // 更新玩家子弹
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const b = this.playerBullets[i];
            b.update(dt);
            if (b.checkMapCollision(this.gameMap, this.particles)) {
                this.playerBullets.splice(i, 1);
                continue;
            }
            if (!b.active) {
                this.playerBullets.splice(i, 1);
            }
        }

        // 更新敌人子弹
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const b = this.enemyBullets[i];
            b.update(dt);
            if (b.checkMapCollision(this.gameMap, this.particles)) {
                this.enemyBullets.splice(i, 1);
                continue;
            }
            if (!b.active) {
                this.enemyBullets.splice(i, 1);
            }
        }

        // 重要机制：【炮弹相碰相互抵消】
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const pb = this.playerBullets[i];
            if (!pb.active) continue;

            for (let j = this.enemyBullets.length - 1; j >= 0; j--) {
                const eb = this.enemyBullets[j];
                if (!eb.active) continue;

                const dist = Math.hypot(pb.x - eb.x, pb.y - eb.y);
                if (dist <= pb.radius + eb.radius + 6) {
                    // 相撞相互抵消！
                    pb.active = false;
                    eb.active = false;

                    const midX = (pb.x + eb.x) / 2;
                    const midY = (pb.y + eb.y) / 2;
                    sound.playBulletClash();
                    this.particles.createClashEffect(midX, midY);
                    break;
                }
            }
        }

        // 清理已被抵消的炮弹
        this.playerBullets = this.playerBullets.filter(b => b.active);
        this.enemyBullets = this.enemyBullets.filter(b => b.active);

        // 玩家炮弹击中敌人
        for (let i = this.playerBullets.length - 1; i >= 0; i--) {
            const b = this.playerBullets[i];
            if (!b.active) continue;

            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                if (!enemy.active) continue;

                const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);
                if (dist < enemy.size / 2 + b.radius) {
                    b.active = false;
                    enemy.hp--;

                    if (enemy.hp <= 0) {
                        enemy.active = false;
                        this.enemiesDefeated++;
                        this.score += enemy.maxHp * 150;
                        sound.playExplosion(true);
                        this.particles.createExplosion(enemy.x, enemy.y, '#f97316', 25, 1.6);

                        // 掉落道具：发光载具必掉，普通敌人 25% 掉落
                        if (enemy.isCarrier || Math.random() < 0.25) {
                            const p = PowerUp.spawnRandom(this.gameMap);
                            if (p) this.powerUps.push(p);
                        }
                    } else {
                        // 命中火花
                        sound.playExplosion(false);
                        this.particles.createExplosion(b.x, b.y, '#ffffff', 10, 0.9);
                    }
                    break;
                }
            }
        }

        // 敌人炮弹击中玩家
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const b = this.enemyBullets[i];
            if (!b.active) continue;

            if (this.player && this.player.active) {
                const dist = Math.hypot(b.x - this.player.x, b.y - this.player.y);
                if (dist < this.player.size / 2 + b.radius) {
                    b.active = false;

                    if (this.player.shieldTimer > 0) {
                        // 无敌护盾挡掉
                        sound.playBulletClash();
                        this.particles.createClashEffect(b.x, b.y);
                    } else {
                        // 玩家受伤
                        this.lives--;
                        sound.playExplosion(true);
                        this.particles.createExplosion(this.player.x, this.player.y, '#ef4444', 30, 1.8);

                        if (this.lives <= 0) {
                            this.player.active = false;
                            this.triggerGameOver('你的坦克被摧毁了！');
                        } else {
                            // 重生
                            this.spawnPlayer();
                        }
                    }
                }
            }
        }
    }

    updatePowerUps(dt) {
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const p = this.powerUps[i];
            p.update(dt);

            if (!p.active) {
                this.powerUps.splice(i, 1);
                continue;
            }

            // 玩家碰撞拾取
            if (this.player && this.player.active) {
                const dist = Math.hypot(this.player.x - p.x, this.player.y - p.y);
                if (dist < this.player.size / 2 + p.size / 2) {
                    p.active = false;
                    this.applyPowerUp(p.type, p.x, p.y);
                    this.powerUps.splice(i, 1);
                }
            }
        }
    }

    applyPowerUp(type, x, y) {
        sound.playPowerUp();
        this.score += 200;

        switch (type) {
            case BUFF_TYPE.FORTRESS:
                // 让老家的墙壁无敌一段时间 (15秒)
                this.gameMap.activateBaseFortress(15);
                this.particles.createBuffPickupEffect(x, y, '#fbbf24');
                break;
            case BUFF_TYPE.POWER_SHELL:
                // 自己的炮弹变厉害能打穿石头
                this.player.applyBuff(BUFF_TYPE.POWER_SHELL);
                this.particles.createBuffPickupEffect(x, y, '#ef4444');
                break;
            case BUFF_TYPE.SHIELD:
                // 自己无敌一段时间
                this.player.applyBuff(BUFF_TYPE.SHIELD);
                this.particles.createBuffPickupEffect(x, y, '#3b82f6');
                break;
            case BUFF_TYPE.SPEED:
                // 自己行走速度变快一段时间
                this.player.applyBuff(BUFF_TYPE.SPEED);
                this.particles.createBuffPickupEffect(x, y, '#10b981');
                break;
        }
    }

    triggerGameOver(reason) {
        this.isGameOver = true;
        sound.playGameOver();
        const modal = document.getElementById('gameOverModal');
        const reasonText = document.getElementById('gameOverReason');
        if (reasonText) reasonText.innerText = reason;
        const finalScore = document.getElementById('gameOverScore');
        if (finalScore) finalScore.innerText = `最终得分: ${this.score}`;
        if (modal) modal.classList.add('active');
    }

    triggerVictory() {
        this.isVictory = true;
        sound.playVictory();
        const modal = document.getElementById('victoryModal');
        const finalScore = document.getElementById('victoryScore');
        if (finalScore) finalScore.innerText = `恭喜胜利！最终得分: ${this.score}`;
        if (modal) modal.classList.add('active');
    }

    hideModals() {
        const gm = document.getElementById('gameOverModal');
        if (gm) gm.classList.remove('active');
        const vm = document.getElementById('victoryModal');
        if (vm) vm.classList.remove('active');
    }

    updateUI() {
        const scoreEl = document.getElementById('scoreDisplay');
        if (scoreEl) scoreEl.innerText = this.score;

        const livesEl = document.getElementById('livesDisplay');
        if (livesEl) {
            livesEl.innerText = this.lives > 5 ? `❤️ × ${this.lives}` : '❤️'.repeat(Math.max(0, this.lives));
        }

        const enemiesLeftEl = document.getElementById('enemiesLeftDisplay');
        if (enemiesLeftEl) {
            const left = Math.max(0, this.totalEnemiesToSpawn - this.enemiesDefeated);
            enemiesLeftEl.innerText = left;
        }

        // Buff 状态指示器
        const buffContainer = document.getElementById('activeBuffsContainer');
        if (buffContainer && this.player) {
            let html = '';
            if (this.gameMap.baseFortressActive) {
                html += `<span class="buff-tag fortress">🏰 基地铁壁: ${Math.ceil(this.gameMap.baseFortressTimer)}s</span>`;
            }
            if (this.player.powerShellTimer > 0) {
                html += `<span class="buff-tag power">⭐ 穿石重炮: ${Math.ceil(this.player.powerShellTimer)}s</span>`;
            }
            if (this.player.shieldTimer > 0) {
                html += `<span class="buff-tag shield">🛡️ 自身无敌: ${Math.ceil(this.player.shieldTimer)}s</span>`;
            }
            if (this.player.speedTimer > 0) {
                html += `<span class="buff-tag speed">⚡ 极速机动: ${Math.ceil(this.player.speedTimer)}s</span>`;
            }
            buffContainer.innerHTML = html;
        }
    }

    draw() {
        // 清屏
        this.ctx.fillStyle = '#0a0a0c';
        this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

        // 1. 地图
        this.gameMap.draw(this.ctx);

        // 2. 道具
        this.powerUps.forEach(p => p.draw(this.ctx));

        // 3. 敌方坦克
        this.enemies.forEach(e => e.draw(this.ctx));

        // 4. 玩家坦克
        if (this.player && this.player.active) {
            this.player.draw(this.ctx);
        }

        // 5. 炮弹 (包含相互抵消特效)
        this.playerBullets.forEach(b => b.draw(this.ctx));
        this.enemyBullets.forEach(b => b.draw(this.ctx));

        // 6. 爆炸碎屑与火花粒子
        this.particles.draw(this.ctx);

        // 7. 暂停时画面半透明提示
        if (this.isPaused) {
            this.ctx.save();
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
            this.ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

            this.ctx.font = 'bold 34px -apple-system, monospace';
            this.ctx.fillStyle = '#38bdf8';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('⏸️ 游戏已暂停', this.logicalWidth / 2, this.logicalHeight / 2 - 15);

            this.ctx.font = '16px -apple-system, sans-serif';
            this.ctx.fillStyle = '#cbd5e1';
            this.ctx.fillText('点击右上角「继续」或按 P 键继续作战', this.logicalWidth / 2, this.logicalHeight / 2 + 25);
            this.ctx.restore();
        }
    }

    loop(currentTime) {
        const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
        this.lastTime = currentTime;

        this.update(dt);
        this.draw();

        requestAnimationFrame(this.loop);
    }
}

// 页面加载后启动
window.addEventListener('DOMContentLoaded', () => {
    window.tankGame = new TankGame();
});
