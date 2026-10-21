// User Custom Tank Camo / Hand-drawn Skin Painter
export class TankPainter {
    constructor(onSkinUpdated, onOpenModal, onCloseModal) {
        this.onSkinUpdated = onSkinUpdated;
        this.onOpenModal = onOpenModal;
        this.onCloseModal = onCloseModal;

        this.canvasSize = 120; // 内部高分辨率绘制，缩放至坦克车身
        this.canvas = null;
        this.ctx = null;
        this.isDrawing = false;
        this.currentColor = '#10b981';
        this.brushSize = 6;
        this.isEraser = false;

        // 炮台颜色
        this.turretColor = '#22c55e';

        this.tankSkinCanvas = document.createElement('canvas');
        this.tankSkinCanvas.width = 40;
        this.tankSkinCanvas.height = 40;

        this.initDOM();
        this.loadSavedSkin();
    }

    initDOM() {
        this.modal = document.getElementById('paintModal');
        this.canvas = document.getElementById('paintCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = this.canvasSize;
        this.canvas.height = this.canvasSize;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // 1. 车身调色板
        const paletteContainer = document.getElementById('colorPalette');
        const colors = [
            '#22c55e', '#15803d', '#166534', // 军绿系
            '#eab308', '#ca8a04', '#854d0e', // 沙漠黄
            '#ef4444', '#b91c1c', '#7f1d1d', // 炽热红
            '#3b82f6', '#1d4ed8', '#1e3a8a', // 科技蓝
            '#a855f7', '#7e22ce', '#3b0764', // 赛博紫
            '#f97316', '#06b6d4', '#ffffff', '#1e293b' // 橙、青、白、深铁
        ];

        if (paletteContainer) {
            paletteContainer.innerHTML = '';
            colors.forEach(col => {
                const btn = document.createElement('div');
                btn.className = 'color-swatch';
                btn.style.backgroundColor = col;
                if (col === this.currentColor) btn.classList.add('active');
                btn.onclick = () => {
                    this.isEraser = false;
                    this.currentColor = col;
                    document.querySelectorAll('#colorPalette .color-swatch').forEach(s => s.classList.remove('active'));
                    btn.classList.add('active');
                    const eraserBtn = document.getElementById('eraserBtn');
                    if (eraserBtn) eraserBtn.classList.remove('active');
                };
                paletteContainer.appendChild(btn);
            });
        }

        // 自定义车身颜色拾取器
        const customColorPicker = document.getElementById('customColorPicker');
        if (customColorPicker) {
            customColorPicker.addEventListener('input', (e) => {
                this.isEraser = false;
                this.currentColor = e.target.value;
                document.querySelectorAll('#colorPalette .color-swatch').forEach(s => s.classList.remove('active'));
            });
        }

        // 2. 炮台调色板
        const turretPaletteContainer = document.getElementById('turretColorPalette');
        const turretColors = [
            '#22c55e', '#10b981', '#f59e0b', '#ef4444', 
            '#38bdf8', '#a855f7', '#ec4899', '#f8fafc', '#334155'
        ];

        if (turretPaletteContainer) {
            turretPaletteContainer.innerHTML = '';
            turretColors.forEach(col => {
                const btn = document.createElement('div');
                btn.className = 'color-swatch';
                btn.style.backgroundColor = col;
                if (col.toLowerCase() === this.turretColor.toLowerCase()) btn.classList.add('active');
                btn.onclick = () => {
                    this.setTurretColor(col);
                };
                turretPaletteContainer.appendChild(btn);
            });
        }

        // 自定义炮台颜色拾取器
        const customTurretColorPicker = document.getElementById('customTurretColorPicker');
        if (customTurretColorPicker) {
            customTurretColorPicker.addEventListener('input', (e) => {
                this.setTurretColor(e.target.value);
            });
        }

        // 3. 橡皮擦
        const eraserBtn = document.getElementById('eraserBtn');
        if (eraserBtn) {
            eraserBtn.onclick = () => {
                this.isEraser = true;
                eraserBtn.classList.add('active');
                document.querySelectorAll('#colorPalette .color-swatch').forEach(s => s.classList.remove('active'));
            };
        }

        // 4. 笔刷大小
        const brushSlider = document.getElementById('brushSizeSlider');
        if (brushSlider) {
            brushSlider.addEventListener('input', (e) => {
                this.brushSize = parseInt(e.target.value, 10);
            });
        }

        // 5. 清空重置画板
        const clearBtn = document.getElementById('clearPaintBtn');
        if (clearBtn) {
            clearBtn.onclick = () => this.drawDefaultBasePattern();
        }

        // 6. 预设涂装
        const presetCamouflage = document.getElementById('presetCamouflage');
        if (presetCamouflage) {
            presetCamouflage.onclick = () => this.applyPreset('camo');
        }
        const presetCyber = document.getElementById('presetCyber');
        if (presetCyber) {
            presetCyber.onclick = () => this.applyPreset('cyber');
        }
        const presetFire = document.getElementById('presetFire');
        if (presetFire) {
            presetFire.onclick = () => this.applyPreset('fire');
        }

        // 7. 保存/装备涂装
        const applyBtn = document.getElementById('applySkinBtn');
        if (applyBtn) {
            applyBtn.onclick = () => {
                this.saveSkin();
                this.closeModal();
            };
        }

        // 关闭弹窗
        const closeBtn = document.getElementById('closePaintModal');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeModal();
        }

        // 画布触摸与鼠标事件
        const getCanvasCoords = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            let clientX, clientY;
            if (e.touches && e.touches.length > 0) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }
            const scaleX = this.canvas.width / rect.width;
            const scaleY = this.canvas.height / rect.height;
            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY
            };
        };

        const startDraw = (e) => {
            e.preventDefault();
            this.isDrawing = true;
            const pos = getCanvasCoords(e);
            this.lastX = pos.x;
            this.lastY = pos.y;
            this.drawDot(pos.x, pos.y);
        };

        const drawMove = (e) => {
            if (!this.isDrawing) return;
            e.preventDefault();
            const pos = getCanvasCoords(e);
            this.drawLine(this.lastX, this.lastY, pos.x, pos.y);
            this.lastX = pos.x;
            this.lastY = pos.y;
        };

        const endDraw = (e) => {
            if (this.isDrawing) {
                e.preventDefault();
                this.isDrawing = false;
                this.updateLivePreview();
            }
        };

        this.canvas.addEventListener('mousedown', startDraw);
        window.addEventListener('mousemove', drawMove);
        window.addEventListener('mouseup', endDraw);

        this.canvas.addEventListener('touchstart', startDraw, { passive: false });
        window.addEventListener('touchmove', drawMove, { passive: false });
        window.addEventListener('touchend', endDraw, { passive: false });
    }

    setTurretColor(color) {
        this.turretColor = color;
        document.querySelectorAll('#turretColorPalette .color-swatch').forEach(s => {
            s.classList.toggle('active', s.style.backgroundColor === color);
        });
        const customTurret = document.getElementById('customTurretColorPicker');
        if (customTurret) customTurret.value = color;
        this.updateLivePreview();
    }

    drawDot(x, y) {
        this.ctx.save();
        if (this.isEraser) {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.fillStyle = 'rgba(0,0,0,1)';
        } else {
            this.ctx.fillStyle = this.currentColor;
        }
        this.ctx.beginPath();
        this.ctx.arc(x, y, this.brushSize / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.restore();
    }

    drawLine(x1, y1, x2, y2) {
        this.ctx.save();
        if (this.isEraser) {
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.strokeStyle = 'rgba(0,0,0,1)';
        } else {
            this.ctx.strokeStyle = this.currentColor;
        }
        this.ctx.lineWidth = this.brushSize;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawDefaultBasePattern() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = '#22c55e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 迷彩斑块
        this.ctx.fillStyle = '#15803d';
        this.ctx.beginPath();
        this.ctx.arc(30, 30, 24, 0, Math.PI * 2);
        this.ctx.arc(90, 80, 28, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#ca8a04';
        this.ctx.beginPath();
        this.ctx.arc(85, 30, 18, 0, Math.PI * 2);
        this.ctx.arc(35, 90, 20, 0, Math.PI * 2);
        this.ctx.fill();

        this.setTurretColor('#15803d');
        this.updateLivePreview();
    }

    applyPreset(type) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (type === 'camo') {
            this.drawDefaultBasePattern();
        } else if (type === 'cyber') {
            // 霓虹紫蓝未来风
            this.ctx.fillStyle = '#0f172a';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.strokeStyle = '#06b6d4';
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(10, 10, 100, 100);
            this.ctx.strokeStyle = '#ec4899';
            this.ctx.beginPath();
            this.ctx.moveTo(10, 10);
            this.ctx.lineTo(110, 110);
            this.ctx.moveTo(110, 10);
            this.ctx.lineTo(10, 110);
            this.ctx.stroke();

            this.setTurretColor('#ec4899');
        } else if (type === 'fire') {
            // 炽热烈焰
            const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
            grad.addColorStop(0, '#fef08a');
            grad.addColorStop(0.5, '#f97316');
            grad.addColorStop(1, '#dc2626');
            this.ctx.fillStyle = grad;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#450a0a';
            this.ctx.beginPath();
            this.ctx.arc(60, 60, 24, 0, Math.PI * 2);
            this.ctx.fill();

            this.setTurretColor('#ef4444');
        }
        this.updateLivePreview();
    }

    updateLivePreview() {
        const previewCanvas = document.getElementById('skinPreviewCanvas');
        if (!previewCanvas) return;

        const pCtx = previewCanvas.getContext('2d');
        const pw = previewCanvas.width;
        const ph = previewCanvas.height;
        pCtx.clearRect(0, 0, pw, ph);

        // 绘制完整逼真的装车预览坦克模型（居中，朝上）
        pCtx.save();
        pCtx.translate(pw / 2, ph / 2);

        const s = 48; // 预览尺寸
        const hs = s / 2;

        // 1. 履带
        pCtx.fillStyle = '#0f172a';
        pCtx.fillRect(-hs, -hs, s, 10);
        pCtx.fillRect(-hs, hs - 10, s, 10);
        pCtx.fillStyle = '#475569';
        for (let i = 0; i < 6; i++) {
            pCtx.fillRect(-hs + i * 8 + 2, -hs, 2, 10);
            pCtx.fillRect(-hs + i * 8 + 2, hs - 10, 2, 10);
        }

        // 2. 车身手绘贴图
        pCtx.save();
        pCtx.beginPath();
        pCtx.rect(-hs + 4, -hs + 8, s - 8, s - 16);
        pCtx.clip();
        pCtx.drawImage(this.canvas, -hs + 4, -hs + 8, s - 8, s - 16);
        pCtx.restore();

        pCtx.strokeStyle = '#022c22';
        pCtx.lineWidth = 1.5;
        pCtx.strokeRect(-hs + 4, -hs + 8, s - 8, s - 16);

        // 3. 炮管（朝上）与用户自定义炮台颜色
        pCtx.fillStyle = this.turretColor;
        pCtx.fillRect(-3, -hs - 6, 6, hs + 6); // 竖直朝上炮管

        // 4. 炮塔圆顶
        pCtx.beginPath();
        pCtx.arc(0, 0, 10, 0, Math.PI * 2);
        pCtx.fill();
        pCtx.strokeStyle = '#0f172a';
        pCtx.lineWidth = 1.5;
        pCtx.stroke();

        pCtx.restore();
    }

    saveSkin() {
        // 压缩至 40x40
        const sCtx = this.tankSkinCanvas.getContext('2d');
        sCtx.clearRect(0, 0, 40, 40);
        sCtx.drawImage(this.canvas, 0, 0, 40, 40);

        try {
            const dataUrl = this.canvas.toDataURL('image/png');
            localStorage.setItem('customTankSkin', dataUrl);
            localStorage.setItem('customTurretColor', this.turretColor);
        } catch (e) {
            console.warn('LocalStorage skin save failed:', e);
        }

        if (this.onSkinUpdated) {
            this.onSkinUpdated(this.tankSkinCanvas, this.turretColor);
        }
    }

    loadSavedSkin() {
        const savedTurret = localStorage.getItem('customTurretColor');
        if (savedTurret) {
            this.turretColor = savedTurret;
        }

        const saved = localStorage.getItem('customTankSkin');
        if (saved) {
            const img = new Image();
            img.onload = () => {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                this.ctx.drawImage(img, 0, 0, this.canvas.width, this.canvas.height);
                this.saveSkin();
            };
            img.src = saved;
        } else {
            this.drawDefaultBasePattern();
            this.saveSkin();
        }
    }

    openModal() {
        if (this.modal) {
            this.modal.classList.add('active');
            this.updateLivePreview();
        }
        if (this.onOpenModal) {
            this.onOpenModal();
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
        if (this.onCloseModal) {
            this.onCloseModal();
        }
    }
}
