// Virtual On-Screen Joystick for mobile & iPad left-hand controls
import { DIRECTION } from './tank.js';

export class VirtualJoystick {
    constructor(containerId, knobId, onMove, onStop) {
        this.container = document.getElementById(containerId);
        this.knob = document.getElementById(knobId);
        this.onMove = onMove;
        this.onStop = onStop;

        this.isActive = false;
        this.touchId = null;
        this.center = { x: 0, y: 0 };
        this.maxRadius = 55; // 蘑菇头最大拉伸半径 (加大提升手感)
        this.deadzone = 10;  // 死区

        this.currentDir = null;

        if (this.container && this.knob) {
            this.initEvents();
        }
    }

    initEvents() {
        const handleStart = (clientX, clientY, identifier = null) => {
            this.isActive = true;
            this.touchId = identifier;

            const rect = this.container.getBoundingClientRect();
            this.center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };
            this.maxRadius = Math.max(50, rect.width * 0.38);

            this.updateKnobPosition(clientX, clientY);
        };

        const handleMove = (clientX, clientY) => {
            if (!this.isActive) return;
            this.updateKnobPosition(clientX, clientY);
        };

        const handleEnd = () => {
            if (!this.isActive) return;
            this.isActive = false;
            this.touchId = null;
            this.currentDir = null;

            // 弹回中心
            this.knob.style.transform = 'translate(-50%, -50%)';
            if (this.onStop) {
                this.onStop();
            }
        };

        // 触控事件 (移动设备 & iPad)
        this.container.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.touchId !== null) return;
            const touch = e.changedTouches[0];
            handleStart(touch.clientX, touch.clientY, touch.identifier);
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            if (!this.isActive) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                if (touch.identifier === this.touchId) {
                    e.preventDefault();
                    handleMove(touch.clientX, touch.clientY);
                    break;
                }
            }
        }, { passive: false });

        const endTouch = (e) => {
            if (!this.isActive) return;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchId) {
                    handleEnd();
                    break;
                }
            }
        };

        window.addEventListener('touchend', endTouch, { passive: false });
        window.addEventListener('touchcancel', endTouch, { passive: false });

        // 鼠标支持 (PC 端测试与拖拽)
        this.container.addEventListener('mousedown', (e) => {
            e.preventDefault();
            handleStart(e.clientX, e.clientY);
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isActive && this.touchId === null) {
                handleMove(e.clientX, e.clientY);
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isActive && this.touchId === null) {
                handleEnd();
            }
        });
    }

    updateKnobPosition(clientX, clientY) {
        const dx = clientX - this.center.x;
        const dy = clientY - this.center.y;
        const distance = Math.hypot(dx, dy);

        let clampedDist = Math.min(distance, this.maxRadius);
        let angle = Math.atan2(dy, dx);

        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        this.knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

        if (distance < this.deadzone) {
            this.currentDir = null;
            if (this.onStop) this.onStop();
            return;
        }

        // 转换为正交 4 方向（上、下、左、右）
        let dir = null;
        if (Math.abs(dx) > Math.abs(dy)) {
            dir = dx > 0 ? DIRECTION.RIGHT : DIRECTION.LEFT;
        } else {
            dir = dy > 0 ? DIRECTION.DOWN : DIRECTION.UP;
        }

        this.currentDir = dir;
        if (this.onMove) {
            this.onMove(dir, clampedDist / this.maxRadius);
        }
    }
}
