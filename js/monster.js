/**
 * 基礎食物資料字典（Master Data）：將重複的資料集中管理，杜絕死資料
 */
const foodDictionary = {
    apple: { name: "Apple", color: "RED", img: "assets/images/monster/apple.png" },
    banana: { name: "Banana", color: "YELLOW", img: "assets/images/monster/banana.png" },
    broccoli: { name: "Broccoli", color: "GREEN", img: "assets/images/monster/broccoli.png" }
};

/**
 * 關卡配置設定表：移除重複的物件宣告，僅靠關鍵字 ID 與食物字典串接
 */
const levelSettings = [
    { targetColor: "RED", hexColor: "#FF2E63", foodIds: ["apple", "banana", "broccoli"] },
    { targetColor: "YELLOW", hexColor: "#FFB200", foodIds: ["banana", "apple", "broccoli"] },
    { targetColor: "GREEN", hexColor: "#2ECC71", foodIds: ["broccoli", "apple", "banana"] }
];

/**
 * 遊戲運作內部狀態機
 */
let gameRuntime = {
    currentLevelIndex: 0,
    isActionLocked: false
};

/**
 * 快取 DOM 節點：新增重置按鈕節點
 */
const ui = {
    levelText: document.getElementById('monster-level'),
    bubble: document.getElementById('target-bubble'),
    monsterBox: document.getElementById('monster-character'),
    monsterImg: document.getElementById('monster-img'),
    foodContainer: document.querySelector('.food-list'),
    restartBtn: document.getElementById('btn-restart')
};

/**
 * 集中管理 HTML5 Audio 實例
 */
const audioSys = {
    click: new Audio('assets/audio/click.mp3'),
    munch: new Audio('assets/audio/monster/munch.mp3'),
    boing: new Audio('assets/audio/boing.mp3'),
    
    /**
     * 播放指定音效並重置播放指針
     * @param {Audio} sound - 音效物件
     */
    trigger: function(sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
};

/**
 * 初始化並建構當前關卡畫面：移除任何內聯樣式控制，改用 CSS Class 語意化
 */
function initMonsterLevel() {
    const config = levelSettings[gameRuntime.currentLevelIndex];
    
    ui.levelText.textContent = gameRuntime.currentLevelIndex + 1;
    
    // 使用純粹的 CSS Class 來控制顏色與字型大小，避免內聯樣式破壞響應式配置
    ui.bubble.innerHTML = `外星怪獸說：我想要吃 <span id="target-color-text" class="highlight-target" style="color: ${config.hexColor};">${config.targetColor}</span> 的食物！`;
    
    ui.monsterImg.src = "assets/images/monster/monster-idle.png";
    ui.foodContainer.innerHTML = "";

    // 透過關卡定義的 ID，從字典檔動態撈取對應的食物資料
    config.foodIds.forEach(id => {
        const data = foodDictionary[id];
        
        const itemNode = document.createElement('div');
        itemNode.classList.add('food-item');
        itemNode.dataset.color = data.color;

        const imgNode = document.createElement('img');
        imgNode.src = data.img;
        imgNode.alt = data.name;
        imgNode.setAttribute('draggable', 'false');

        itemNode.appendChild(imgNode);
        ui.foodContainer.appendChild(itemNode);

        attachPointerDragLogic(itemNode);
    });
}

/**
 * 重置遊戲狀態機至第一關
 */
function restartGame() {
    // 防呆機制：如果當前畫面正在播放怪獸吃東西的過渡動畫，禁止重置以防破圖
    if (gameRuntime.isActionLocked) return;

    audioSys.trigger(audioSys.click);
    gameRuntime.currentLevelIndex = 0;
    initMonsterLevel();
}

/**
 * 綁定極致流暢的指針拖曳運算
 * @param {HTMLElement} targetElement - 被拖曳的食物節點
 */
function attachPointerDragLogic(targetElement) {
    let internalOffsetX = 0;
    let internalOffsetY = 0;

    /**
     * 點擊/觸碰
     * @param {PointerEvent} event - 指標事件
     */
    function dragStart(event) {
        if (gameRuntime.isActionLocked) return;
        
        audioSys.trigger(audioSys.click);
        targetElement.setPointerCapture(event.pointerId);
        ui.monsterBox.classList.remove('breathe-animation');

        const bounds = targetElement.getBoundingClientRect();
        internalOffsetX = event.clientX - bounds.left;
        internalOffsetY = event.clientY - bounds.top;

        targetElement.style.position = 'fixed';
        targetElement.style.left = `${event.clientX - internalOffsetX}px`;
        targetElement.style.top = `${event.clientY - internalOffsetY}px`;

        targetElement.addEventListener('pointermove', dragMove);
        targetElement.addEventListener('pointerup', dragEnd);
    }

    /**
     * 位移
     * @param {PointerEvent} event - 指標事件
     */
    function dragMove(event) {
        targetElement.style.left = `${event.clientX - internalOffsetX}px`;
        targetElement.style.top = `${event.clientY - internalOffsetY}px`;

        if (isColliding(targetElement, ui.monsterBox)) {
            ui.monsterBox.classList.add('target-hover');
        } else {
            ui.monsterBox.classList.remove('target-hover');
        }
    }

    /**
     * 放開
     * @param {PointerEvent} event - 指標事件
     */
    function dragEnd(event) {
        targetElement.removeEventListener('pointermove', dragMove);
        targetElement.removeEventListener('pointerup', dragEnd);
        targetElement.releasePointerCapture(event.pointerId);

        ui.monsterBox.classList.add('breathe-animation');

        if (isColliding(targetElement, ui.monsterBox)) {
            const currentLevel = levelSettings[gameRuntime.currentLevelIndex];
            if (targetElement.dataset.color === currentLevel.targetColor) {
                processCorrectEat(targetElement);
            } else {
                processWrongEat(targetElement);
            }
        } else {
            processWrongEat(targetElement);
        }
    }

    targetElement.addEventListener('pointerdown', dragStart);
}

/**
 * 幾何區域碰撞檢查器
 * @param {HTMLElement} elementA - 食物
 * @param {HTMLElement} elementB - 怪獸
 * @returns {boolean} - 是否碰撞
 */
function isColliding(elementA, elementB) {
    const a = elementA.getBoundingClientRect();
    const b = elementB.getBoundingClientRect();
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

/**
 * 正確餵食反饋
 * @param {HTMLElement} element - 食物
 */
function processCorrectEat(element) {
    gameRuntime.isActionLocked = true;
    ui.monsterBox.classList.remove('target-hover');
    ui.monsterImg.src = "assets/images/monster/monster-eat.png";
    audioSys.trigger(audioSys.munch);
    element.style.display = 'none';

    setTimeout(() => {
        gameRuntime.isActionLocked = false;
        if (gameRuntime.currentLevelIndex < levelSettings.length - 1) {
            gameRuntime.currentLevelIndex++;
            initMonsterLevel();
        } else {
            // 通關文字改由預先定義好的 CSS Class 渲染，確保跨裝置解析度字體不縮水
            ui.bubble.innerHTML = "🎉 <span class='game-complete-text'>全部通關！</span> 怪獸肚子飽飽囉！";
        }
    }, 1500);
}

/**
 * 錯誤餵食彈回反饋
 * @param {HTMLElement} element - 食物
 */
function processWrongEat(element) {
    gameRuntime.isActionLocked = true;
    ui.monsterBox.classList.remove('target-hover');
    audioSys.trigger(audioSys.boing);

    element.style.transition = 'all 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.2)';
    element.style.position = 'relative';
    element.style.left = '0px';
    element.style.top = '0px';

    setTimeout(() => {
        element.style.transition = 'none';
        gameRuntime.isActionLocked = false;
    }, 350);
}

// 核心初始化監聽
document.addEventListener('DOMContentLoaded', () => {
    initMonsterLevel();
    // 綁定重新開始按鈕點擊事件，代替死板的 HTML inline JS
    ui.restartBtn.addEventListener('click', restartGame);
});