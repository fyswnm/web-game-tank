// Tank base, PlayerTank, and EnemyTank
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from './map.js';
import { Bullet } from './bullet.js';
import { BUFF_TYPE } from './powerup.js';

export const DIRECTION = {
    UP: -Math.PI / 2,
    DOWN: Math.PI / 2,
    LEFT: Math.PI,
    RIGHT: 0
};

export class Tank {
    constructor(x, y, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.size = 38; // 碰撞体积
        this.isPlayer = isPlayer;
        this.angle = DIRECTION.UP;
        this.baseSpeed = 120; // 像素/秒
        this.speed = this.baseSpeed;
        this.hp = 1;
        this.maxHp = 1;
        this.active = true;

        this.shootCooldown = 0.45; // 射击冷却
        this.shootTimer = 0;

        // 动画相关
        this.trackOffset = 0;
        this.recoil = 0; // 开炮后坐力
    }

    update(dt) {
        if (this.shootTimer > 0) {
            this.shootTimer -= dt;
        }
        if (this.recoil > 0) {
            this.recoil = Math.max(0, this.recoil - dt * 25);
        }
    }

    shoot(bulletArray, sound) {
        if (this.shootTimer > 0) return null;
        this.shootTimer = this.shootCooldown;
        this.recoil = 6;

        // 炮口位置（依据炮塔朝向计算）
        const barrelLength = this.size / 2 + 8;
        const bx = this.x + Math.cos(this.angle) * barrelLength;
        const by = this.y + Math.sin(this.angle) * barrelLength;

        const bulletSpeed = this.isPlayer ? 320 : 250;
        const canBreakStone = this.isPlayer && (this.powerShellTimer > 0);

        const b = new Bullet(bx, by, this.angle, bulletSpeed, this.isPlayer, canBreakStone);
        bulletArray.push(b);

        if (sound) sound.playShoot();
        return b;
    }

    canMoveTo(tx, ty, gameMap) {
        const hs = this.size / 2 - 2;
        const corners = [
            { x: tx - hs, y: ty - hs },
            { x: tx + hs, y: ty - hs },
            { x: tx - hs, y: ty + hs },
            { x: tx + hs, y: ty + hs }
        ];

        for (const pt of corners) {
            const col = Math.floor(pt.x / TILE_SIZE);
            const row = Math.floor(pt.y / TILE_SIZE);
            if (gameMap.isBlockedForMovement(col, row)) {
                return false;
            }
        }
        return true;
    }

    drawBaseTank(ctx, bodyColor, turretColor) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const s = this.size;
        const hs = s / 2;

        // 1. 履带（左右两条）
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-hs, -hs, s, 9); // 左履带
        ctx.fillRect(-hs, hs - 9, s, 9); // 右履带

        // 履带轮槽齿
        ctx.fillStyle = '#475569';
        const numTreads = 6;
        for (let i = 0; i < numTreads; i++) {
            const tx = -hs + (i * 7 + (this.trackOffset % 7));
            if (tx >= -hs && tx <= hs - 2) {
                ctx.fillRect(tx, -hs, 2, 9);
                ctx.fillRect(tx, hs - 9, 2, 9);
            }
        }

        // 2. 车身装甲
        ctx.fillStyle = bodyColor;
        ctx.fillRect(-hs + 4, -hs + 7, s - 8, s - 14);

        // 装甲细节缝线
        ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-hs + 4, -hs + 7, s - 8, s - 14);

        // 3. 炮管与炮口后坐力
        ctx.fillStyle = turretColor;
        const barrelX = -this.recoil;
        ctx.fillRect(barrelX, -3, hs + 9, 6);

        // 4. 炮塔圆顶
        ctx.fillStyle = turretColor;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    }
}

export class PlayerTank extends Tank {
    constructor(x, y) {
        super(x, y, true);
        this.baseSpeed = 135;
        this.speed = this.baseSpeed;
        this.angle = DIRECTION.UP;

        // 寻路导航队列
        this.path = [];
        this.targetDestination = null;

        // Buff 计时器
        this.shieldTimer = 0;       // 自身无敌
        this.powerShellTimer = 0;   // 炮弹穿石
        this.speedTimer = 0;        // 自身加速

        // 自定义涂装贴图画布与炮台颜色
        this.customSkinCanvas = null;
        this.customTurretColor = '#22c55e';

        // 摇杆控制方向
        this.joystickDir = null;
    }

    setJoystickInput(dir) {
        this.joystickDir = dir;
        if (dir !== null) {
            // 摇杆介入时，清空先前的点击自动寻路
            this.path = [];
            this.targetDestination = null;
        }
    }

    setPath(points, finalDest) {
        this.joystickDir = null; // 点击寻路时重置摇杆
        this.path = points || [];
        this.targetDestination = finalDest;
    }

    applyBuff(type) {
        switch (type) {
            case BUFF_TYPE.SHIELD:
                this.shieldTimer = 12; // 12秒无敌
                break;
            case BUFF_TYPE.POWER_SHELL:
                this.powerShellTimer = 15; // 15秒穿石弹
                break;
            case BUFF_TYPE.SPEED:
                this.speedTimer = 12; // 12秒极速
                break;
        }
    }

    update(dt, gameMap) {
        super.update(dt);

        // 更新 Buff
        if (this.shieldTimer > 0) this.shieldTimer -= dt;
        if (this.powerShellTimer > 0) this.powerShellTimer -= dt;

        if (this.speedTimer > 0) {
            this.speedTimer -= dt;
            this.speed = this.baseSpeed * 1.65;
        } else {
            this.speed = this.baseSpeed;
        }

        // 1. 摇杆主动控制行走
        if (this.joystickDir !== null) {
            this.angle = this.joystickDir;
            const moveStep = this.speed * dt;
            let nextX = this.x + Math.cos(this.angle) * moveStep;
            let nextY = this.y + Math.sin(this.angle) * moveStep;

            // 智能拐角吸附 (Corner Alignment - 解决FC经典直角拐角防卡死)
            if (this.angle === DIRECTION.UP || this.angle === DIRECTION.DOWN) {
                const nearestCol = Math.round((this.x - TILE_SIZE / 2) / TILE_SIZE);
                const targetCenterX = nearestCol * TILE_SIZE + TILE_SIZE / 2;
                const diffX = targetCenterX - this.x;
                if (Math.abs(diffX) < 14) {
                    this.x += diffX * 0.25;
                    nextX = this.x;
                }
            } else if (this.angle === DIRECTION.LEFT || this.angle === DIRECTION.RIGHT) {
                const nearestRow = Math.round((this.y - TILE_SIZE / 2) / TILE_SIZE);
                const targetCenterY = nearestRow * TILE_SIZE + TILE_SIZE / 2;
                const diffY = targetCenterY - this.y;
                if (Math.abs(diffY) < 14) {
                    this.y += diffY * 0.25;
                    nextY = this.y;
                }
            }

            if (this.canMoveTo(nextX, nextY, gameMap)) {
                this.x = nextX;
                this.y = nextY;
                this.trackOffset += moveStep;
            }

            // 保持在地图边界内
            const minCoord = this.size / 2;
            const maxCoordX = MAP_COLS * TILE_SIZE - minCoord;
            const maxCoordY = MAP_ROWS * TILE_SIZE - minCoord;
            this.x = Math.max(minCoord, Math.min(maxCoordX, this.x));
            this.y = Math.max(minCoord, Math.min(maxCoordY, this.y));
        }
        // 2. 点击自动寻路移动
        else if (this.path.length > 0) {
            const nextNode = this.path[0];
            const dx = nextNode.x - this.x;
            const dy = nextNode.y - this.y;
            const dist = Math.hypot(dx, dy);

            // 确定目标角度（正交平滑旋转）
            const targetAngle = Math.atan2(dy, dx);
            this.alignAngle(targetAngle);

            const moveStep = this.speed * dt;

            if (dist <= moveStep) {
                // 到达当前路点，移到下一个
                this.x = nextNode.x;
                this.y = nextNode.y;
                this.path.shift();
                if (this.path.length === 0) {
                    this.targetDestination = null;
                }
            } else {
                // 向路点行进
                const vx = (dx / dist) * moveStep;
                const vy = (dy / dist) * moveStep;
                this.x += vx;
                this.y += vy;
                this.trackOffset += moveStep;
            }

            // 保持在地图边界内
            const minCoord = this.size / 2;
            const maxCoordX = MAP_COLS * TILE_SIZE - minCoord;
            const maxCoordY = MAP_ROWS * TILE_SIZE - minCoord;
            this.x = Math.max(minCoord, Math.min(maxCoordX, this.x));
            this.y = Math.max(minCoord, Math.min(maxCoordY, this.y));
        }
    }

    alignAngle(targetAngle) {
        // 将朝向对齐到最接近的 4 个主方向，保持复古街机操作手感
        const diffs = [
            { a: DIRECTION.UP, diff: Math.abs(this.angleDiff(targetAngle, DIRECTION.UP)) },
            { a: DIRECTION.RIGHT, diff: Math.abs(this.angleDiff(targetAngle, DIRECTION.RIGHT)) },
            { a: DIRECTION.DOWN, diff: Math.abs(this.angleDiff(targetAngle, DIRECTION.DOWN)) },
            { a: DIRECTION.LEFT, diff: Math.abs(this.angleDiff(targetAngle, DIRECTION.LEFT)) }
        ];
        diffs.sort((a, b) => a.diff - b.diff);
        this.angle = diffs[0].a;
    }

    angleDiff(a, b) {
        let d = (a - b) % (Math.PI * 2);
        if (d > Math.PI) d -= Math.PI * 2;
        if (d < -Math.PI) d += Math.PI * 2;
        return d;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const s = this.size;
        const hs = s / 2;

        // 1. 履带
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(-hs, -hs, s, 9);
        ctx.fillRect(-hs, hs - 9, s, 9);

        ctx.fillStyle = this.speedTimer > 0 ? '#34d399' : '#475569';
        for (let i = 0; i < 6; i++) {
            const tx = -hs + (i * 7 + (this.trackOffset % 7));
            if (tx >= -hs && tx <= hs - 2) {
                ctx.fillRect(tx, -hs, 2, 9);
                ctx.fillRect(tx, hs - 9, 2, 9);
            }
        }

        // 2. 车身涂装（若有自定义手绘涂装，则渲染手绘贴图，否则为默认军绿）
        if (this.customSkinCanvas) {
            ctx.save();
            // 剪裁车身区域
            ctx.beginPath();
            ctx.rect(-hs + 4, -hs + 7, s - 8, s - 14);
            ctx.clip();
            ctx.drawImage(this.customSkinCanvas, -hs + 4, -hs + 7, s - 8, s - 14);
            ctx.restore();
        } else {
            ctx.fillStyle = '#15803d';
            ctx.fillRect(-hs + 4, -hs + 7, s - 8, s - 14);
        }

        // 装甲边框
        ctx.strokeStyle = '#022c22';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-hs + 4, -hs + 7, s - 8, s - 14);

        // 3. 炮管与炮塔
        const barrelColor = this.powerShellTimer > 0 ? '#fbbf24' : (this.customTurretColor || '#22c55e');
        const barrelX = -this.recoil;

        // 炮管
        ctx.fillStyle = barrelColor;
        ctx.fillRect(barrelX, -3, hs + 10, 6);

        // 穿石强力弹火光特效
        if (this.powerShellTimer > 0) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(hs + 10 + barrelX, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // 炮塔中心舱盖
        ctx.fillStyle = barrelColor;
        ctx.beginPath();
        ctx.arc(0, 0, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f172a';
        ctx.stroke();

        ctx.restore();

        // 4. 无敌护盾光环（不受旋转影响）
        if (this.shieldTimer > 0) {
            ctx.save();
            ctx.translate(this.x, this.y);
            const shieldPulse = Math.sin(Date.now() / 100) * 3 + 24;
            ctx.strokeStyle = 'rgba(56, 189, 248, 0.85)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, shieldPulse, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(56, 189, 248, 0.2)';
            ctx.beginPath();
            ctx.arc(0, 0, shieldPulse, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // 5. 目标路点指引特效
        if (this.targetDestination) {
            ctx.save();
            ctx.translate(this.targetDestination.x, this.targetDestination.y);
            const r = (Date.now() / 25) % 15 + 4;
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.stroke();

            // 中心十字准星
            ctx.strokeStyle = '#22c55e';
            ctx.beginPath();
            ctx.moveTo(-6, 0); ctx.lineTo(6, 0);
            ctx.moveTo(0, -6); ctx.lineTo(0, 6);
            ctx.stroke();
            ctx.restore();
        }
    }
}

export class EnemyTank extends Tank {
    constructor(x, y, difficulty = 'normal', isCarrier = false) {
        super(x, y, false);
        this.difficulty = difficulty;
        this.isCarrier = isCarrier; // 是否为高概率掉落道具的发光载具
        this.angle = DIRECTION.DOWN;

        this.applyDifficultySettings();

        // AI 状态
        this.changeDirTimer = Math.random() * 2 + 1;
        this.preferredTarget = Math.random() < 0.5 ? 'base' : 'player'; // 目标偏好
    }

    applyDifficultySettings() {
        switch (this.difficulty) {
            case 'normal': // 普通
                this.baseSpeed = 75;
                this.shootCooldown = 1.6;
                this.hp = 1;
                this.bodyColor = '#991b1b';
                this.turretColor = '#dc2626';
                break;
            case 'hard': // 高级
                this.baseSpeed = 95;
                this.shootCooldown = 1.1;
                this.hp = 2; // 耐打
                this.bodyColor = '#831843';
                this.turretColor = '#db2777';
                break;
            case 'expert': // 困难
                this.baseSpeed = 120;
                this.shootCooldown = 0.75;
                this.hp = 3;
                this.bodyColor = '#312e81';
                this.turretColor = '#6366f1';
                break;
        }
        this.speed = this.baseSpeed;
        this.maxHp = this.hp;
    }

    updateAI(dt, gameMap, player, bullets, sound) {
        super.update(dt);

        this.changeDirTimer -= dt;
        if (this.changeDirTimer <= 0) {
            this.chooseNewDirection(gameMap, player);
            this.changeDirTimer = Math.random() * 2 + 1.2;
        }

        // 尝试前进
        const moveStep = this.speed * dt;
        const nextX = this.x + Math.cos(this.angle) * moveStep;
        const nextY = this.y + Math.sin(this.angle) * moveStep;

        if (this.canMoveTo(nextX, nextY, gameMap)) {
            this.x = nextX;
            this.y = nextY;
            this.trackOffset += moveStep;
        } else {
            // 撞墙立即调转方向
            this.chooseNewDirection(gameMap, player);
            this.changeDirTimer = Math.random() * 1.5 + 0.5;
        }

        // 射击判断：若面向玩家或老家则高概率射击
        if (this.shootTimer <= 0) {
            if (this.shouldShoot(player, gameMap)) {
                this.shoot(bullets, sound);
            } else if (Math.random() < 0.02) {
                this.shoot(bullets, sound);
            }
        }
    }

    canMoveTo(tx, ty, gameMap) {
        const hs = this.size / 2 - 2;
        const corners = [
            { x: tx - hs, y: ty - hs },
            { x: tx + hs, y: ty - hs },
            { x: tx - hs, y: ty + hs },
            { x: tx + hs, y: ty + hs }
        ];

        for (const pt of corners) {
            const col = Math.floor(pt.x / TILE_SIZE);
            const row = Math.floor(pt.y / TILE_SIZE);
            if (gameMap.isBlockedForMovement(col, row)) {
                return false;
            }
        }
        return true;
    }

    chooseNewDirection(gameMap, player) {
        const dirs = [DIRECTION.UP, DIRECTION.DOWN, DIRECTION.LEFT, DIRECTION.RIGHT];

        // 困难/高级难度下有更高概率朝玩家或老家方向前进
        let favoredDir = null;
        if (this.preferredTarget === 'base') {
            // 朝下
            favoredDir = DIRECTION.DOWN;
        } else if (player && player.active) {
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            if (Math.abs(dx) > Math.abs(dy)) {
                favoredDir = dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT;
            } else {
                favoredDir = dy > 0 ? DIRECTION.DOWN : DIRECTION.UP;
            }
        }

        if (favoredDir && Math.random() < (this.difficulty === 'expert' ? 0.75 : 0.45)) {
            this.angle = favoredDir;
        } else {
            this.angle = dirs[Math.floor(Math.random() * dirs.length)];
        }
    }

    shouldShoot(player, gameMap) {
        // 判断当前朝向前方是否有视线对准老家或玩家
        const hs = 20;
        if (this.angle === DIRECTION.DOWN && Math.abs(this.x - (gameMap.baseX * TILE_SIZE + 24)) < 30) {
            return true; // 瞄准了老家
        }
        if (player && player.active) {
            if (this.angle === DIRECTION.UP && player.y < this.y && Math.abs(player.x - this.x) < hs) return true;
            if (this.angle === DIRECTION.DOWN && player.y > this.y && Math.abs(player.x - this.x) < hs) return true;
            if (this.angle === DIRECTION.LEFT && player.x < this.x && Math.abs(player.y - this.y) < hs) return true;
            if (this.angle === DIRECTION.RIGHT && player.x > this.x && Math.abs(player.y - this.y) < hs) return true;
        }
        return false;
    }

    draw(ctx) {
        if (this.isCarrier) {
            // 发光道具载具（不断变色）
            const flash = Math.floor(Date.now() / 150) % 2 === 0;
            const color = flash ? '#eab308' : this.bodyColor;
            this.drawBaseTank(ctx, color, '#f59e0b');
        } else {
            this.drawBaseTank(ctx, this.bodyColor, this.turretColor);
        }

        // 多血量坦克绘制血量槽
        if (this.maxHp > 1) {
            ctx.save();
            ctx.translate(this.x, this.y - this.size / 2 - 6);
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(-15, 0, 30, 4);
            ctx.fillStyle = '#ef4444';
            const hpWidth = (this.hp / this.maxHp) * 30;
            ctx.fillRect(-15, 0, hpWidth, 4);
            ctx.restore();
        }
    }
}
