// Breadth-First Search (BFS) grid pathfinding for tank navigation
import { TILE_SIZE, MAP_COLS, MAP_ROWS } from './map.js';

export function findPath(startX, startY, destX, destY, gameMap) {
    // 转换为网格索引
    const startCol = Math.floor(startX / TILE_SIZE);
    const startRow = Math.floor(startY / TILE_SIZE);
    let targetCol = Math.floor(destX / TILE_SIZE);
    let targetRow = Math.floor(destY / TILE_SIZE);

    // 边界校正
    targetCol = Math.max(0, Math.min(MAP_COLS - 1, targetCol));
    targetRow = Math.max(0, Math.min(MAP_ROWS - 1, targetRow));

    // 如果目标不可通行，寻找距离目标最近的空地
    let isAdjusted = false;
    if (gameMap.isBlockedForMovement(targetCol, targetRow)) {
        const nearest = findNearestWalkableTile(targetCol, targetRow, gameMap, startCol, startRow);
        if (nearest) {
            targetCol = nearest.c;
            targetRow = nearest.r;
            isAdjusted = true;
        } else {
            return []; // 无法到达
        }
    }

    if (startCol === targetCol && startRow === targetRow) {
        if (isAdjusted) {
            return [{ x: targetCol * TILE_SIZE + TILE_SIZE / 2, y: targetRow * TILE_SIZE + TILE_SIZE / 2 }];
        }
        return [{ x: destX, y: destY }];
    }

    const queue = [{ c: startCol, r: startRow }];
    const visited = Array(MAP_ROWS).fill(0).map(() => Array(MAP_COLS).fill(false));
    const parent = Array(MAP_ROWS).fill(0).map(() => Array(MAP_COLS).fill(null));

    visited[startRow][startCol] = true;

    const dirs = [
        { dc: 0, dr: -1 }, // 上
        { dc: 1, dr: 0 },  // 右
        { dc: 0, dr: 1 },  // 下
        { dc: -1, dr: 0 }  // 左
    ];

    let found = false;

    while (queue.length > 0) {
        const cur = queue.shift();

        if (cur.c === targetCol && cur.r === targetRow) {
            found = true;
            break;
        }

        for (const dir of dirs) {
            const nc = cur.c + dir.dc;
            const nr = cur.r + dir.dr;

            if (nc >= 0 && nc < MAP_COLS && nr >= 0 && nr < MAP_ROWS) {
                if (!visited[nr][nc] && !gameMap.isBlockedForMovement(nc, nr)) {
                    visited[nr][nc] = true;
                    parent[nr][nc] = cur;
                    queue.push({ c: nc, r: nr });
                }
            }
        }
    }

    if (!found) return [];

    // 重构路径
    const path = [];
    let curr = { c: targetCol, r: targetRow };
    while (curr && !(curr.c === startCol && curr.r === startRow)) {
        // 每个格子的中心点
        path.unshift({
            x: curr.c * TILE_SIZE + TILE_SIZE / 2,
            y: curr.r * TILE_SIZE + TILE_SIZE / 2
        });
        curr = parent[curr.r][curr.c];
    }

    // 最后一个点修正为精确点击位置（仅当点击位置就在可通行格子内时）
    if (path.length > 0 && !isAdjusted) {
        path[path.length - 1] = { x: destX, y: destY };
    }

    return path;
}

function findNearestWalkableTile(tc, tr, gameMap, sc, sr) {
    let best = null;
    let minD = Infinity;

    for (let r = 0; r < MAP_ROWS; r++) {
        for (let c = 0; c < MAP_COLS; c++) {
            if (!gameMap.isBlockedForMovement(c, r)) {
                // 计算与被点击格子的距离
                const distToTarget = Math.hypot(c - tc, r - tr);
                const distToStart = Math.hypot(c - sc, r - sr);
                const totalScore = distToTarget * 2 + distToStart * 0.5;
                if (totalScore < minD) {
                    minD = totalScore;
                    best = { c, r };
                }
            }
        }
    }
    return best;
}
