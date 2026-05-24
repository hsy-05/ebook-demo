/**
 * 基礎食物與顏色資料字典
 * 用途：集中管理所有的食物屬性與對應的顏色，未來若要新增食物，直接在此擴充即可，新手也能一秒看懂
 */
const foodDictionary = {
    apple: { name: "Apple", color: "RED", img: "assets/images/monster/apple.png" },
    banana: { name: "Banana", color: "YELLOW", img: "assets/images/monster/banana.png" },
    broccoli: { name: "Broccoli", color: "GREEN", img: "assets/images/monster/broccoli.png" }
    // 未來若要新增食物，直接在下方複製格式即可，例如：
    // grape: { name: "Grape", color: "PURPLE", img: "assets/images/monster/grape.png" }
};

/**
 * 顏色與色碼對照表
 * 用途：對應文字的特殊顏色標籤，與商務邏輯完全分離，方便未來調整視覺樣式
 */
const colorHexMap = {
    RED: "#FF2E63",
    YELLOW: "#FFB200",
    GREEN: "#2ECC71"
    // PURPLE: "#9B59B6" (未來擴充新顏色時在此填寫色碼)
};

/**
 * 遊戲運存控制器與狀態機
 * 用途：管理目前的關卡計數、設定總關卡上限，並控制動畫播放期間的點擊防呆鎖定
 */
const gameRuntime = {
    currentLevelIndex: 0,
    maxLevels: 3,          // 未來想增加遊戲關卡數，直接修改這個數字即可
    targetColor: "",       // 每關動態隨機抽選的目標顏色
    targetHexColor: "",    // 每關動態隨機抽選的目標文字色碼
    isActionLocked: false
};

/**
 * 快取 DOM 節點物件
 * 用途：將畫面上需要操作的 HTML 標籤集中管理，提升網頁運作效能
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
 * 集中管理本頁專屬互動音效
 * 用途：負責處理怪獸專屬的嚼食聲與失敗彈回聲，其餘全站點擊聲皆交由 EbookAudio 公用管理器控管
 */
const audioSys = {
    munch: new Audio('assets/audio/monster/munch.mp3'),
    boing: new Audio('assets/audio/boing.mp3'),
    
    /**
     * 安全執行音效播放
     * 用途：將傳入的音效進度歸零並即時播放，同時阻斷自動播放限制政策導致的報錯
     * @param {Audio} sound - 欲播放的 HTML5 Audio 特效音實例物件
     */
    trigger: function(sound) {
        if (!sound) return;
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
};

/**
 * 初始化並建構全新的隨機關卡畫面
 * 用途：隨機抽選本關的目標食物顏色，並將所有的食物選項順序徹底洗牌打散，動態渲染至畫面上
 */
function initMonsterLevel() {
    gameRuntime.isActionLocked = false;
    ui.levelText.textContent = gameRuntime.currentLevelIndex + 1;
    
    // 取得目前字典檔中所有的食物主鍵陣列 (例如: ["apple", "banana", "broccoli"])
    const allFoodIds = Object.keys(foodDictionary);
    
    // 隨機抽選其中一個食物作為這一關的正確答案題目
    const randomIndex = Math.floor(Math.random() * allFoodIds.length);
    const targetFoodId = allFoodIds[randomIndex];
    
    // 將隨機選出的食物顏色與對應色碼寫入狀態機
    gameRuntime.targetColor = foodDictionary[targetFoodId].color;
    gameRuntime.targetHexColor = colorHexMap[gameRuntime.targetColor];
    
    // 將出題區塊的文字更新為隨機挑選出來的顏色，維持純 CSS Class 控制
    ui.bubble.innerHTML = `外星怪獸說：我想要吃 <span id="target-color-text" class="highlight-target" style="color: ${gameRuntime.targetHexColor};">${gameRuntime.targetColor}</span> 的食物！`;
    
    // 還原怪獸為預設待機圖 (建議尺寸：400x400 像素透明背景 PNG)
    ui.monsterImg.src = "assets/images/monster/monster-idle.png";
    ui.foodContainer.innerHTML = "";

    // 複製一份食物清單陣列，準備進行Fisher-Yates洗牌演算法，將排列順序徹底打散
    const shuffledFoodIds = [...allFoodIds];
    for (let i = shuffledFoodIds.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = shuffledFoodIds[i];
        shuffledFoodIds[i] = shuffledFoodIds[j];
        shuffledFoodIds[j] = temp;
    }

    // 將隨機打散後的食物依序建立網頁節點並放入畫面
    shuffledFoodIds.forEach(id => {
        const data = foodDictionary[id];
        
        const itemNode = document.createElement('div');
        itemNode.classList.add('food-item');
        itemNode.dataset.color = data.color;

        const imgNode = document.createElement('img');
        imgNode.src = data.img;         // 食物圖片 (建議尺寸：120x120 像素透明背景 PNG)
        imgNode.alt = data.name;
        imgNode.setAttribute('draggable', 'false'); // 關閉瀏覽器預設的圖片拖曳行為以免產生視覺衝突

        itemNode.appendChild(imgNode);
        ui.foodContainer.appendChild(itemNode);

        // 為每一個動態產生的食物元件單獨綁定手勢與滑鼠拖曳邏輯
        attachPointerDragLogic(itemNode);
    });
}

/**
 * 重置遊戲狀態回到第一關
 * 用途：響應重新開始按鈕，調用全站公用點擊音效，並將狀態機關卡歸零重新出題
 */
function restartGame() {
    // 防呆機制：如果正在播放吃東西或失敗彈回的動畫，禁止重置以防止畫面破圖
    if (gameRuntime.isActionLocked) return;

    // 安全調用全站共用音訊管理器播放按鈕點擊聲
    if (window.EbookAudio && typeof window.EbookAudio.playClick === 'function') {
        window.EbookAudio.playClick();
    }
    
    gameRuntime.currentLevelIndex = 0;
    initMonsterLevel();
}

/**
 * 綁定流暢的跨裝置指針拖曳運算
 * 用途：全面支援滑鼠與手機手勢觸控，精準計算位移座標並黏著手指，並同步偵測與怪獸的反饋
 * @param {HTMLElement} targetElement - 被滑鼠或手指按住的食物 DOM 網頁節點
 */
function attachPointerDragLogic(targetElement) {
    let internalOffsetX = 0;
    let internalOffsetY = 0;

    /**
     * 開始按住食物
     * 用途：手指按住食物瞬間觸發防呆、呼叫全域點擊聲、鎖定指針並記錄點擊的相對位移座標
     * @param {PointerEvent} event - 系統傳入的指針點擊事件物件
     */
    function dragStart(event) {
        if (gameRuntime.isActionLocked) return;
        
        // 安全調用全站共用音訊管理器播放點擊聲
        if (window.EbookAudio && typeof window.EbookAudio.playClick === 'function') {
            window.EbookAudio.playClick();
        }
        
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
     * 拖曳移動食物中
     * 用途：跟隨手勢動態更新食物的外觀座標，當食物滑入怪獸身體範圍時加入發光視覺特效
     * @param {PointerEvent} event - 系統傳入的指針滑動事件物件
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
     * 放開食物結束拖曳
     * 用途：移除滑動監聽並釋放指針鎖，若在怪獸區域內放開，則判斷顏色是否符合隨機抽選的正確答案
     * @param {PointerEvent} event - 系統傳入的指針放開事件物件
     */
    function dragEnd(event) {
        targetElement.removeEventListener('pointermove', dragMove);
        targetElement.removeEventListener('pointerup', dragEnd);
        targetElement.releasePointerCapture(event.pointerId);

        ui.monsterBox.classList.add('breathe-animation');

        if (isColliding(targetElement, ui.monsterBox)) {
            if (targetElement.dataset.color === gameRuntime.targetColor) {
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
 * 用途：計算食物與怪獸這兩個網頁元件在畫面上的矩形邊界，判斷兩者是否發生交集重疊
 * @param {HTMLElement} elementA - 食物節點元件
 * @param {HTMLElement} elementB - 怪獸主盒子元件
 * @returns {boolean} - 回傳布林值，當兩者產生碰撞時回傳 true
 */
function isColliding(elementA, elementB) {
    const a = elementA.getBoundingClientRect();
    const b = elementB.getBoundingClientRect();
    return !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
}

/**
 * 正確餵食反饋
 * 用途：鎖定畫面操作防幼兒亂點、切換怪獸吃東西表情圖、播放嚼食聲，並判斷是否達到設定的關卡上限
 * @param {HTMLElement} element - 被正確餵食的食物節點元件
 */
function processCorrectEat(element) {
    gameRuntime.isActionLocked = true;
    ui.monsterBox.classList.remove('target-hover');
    ui.monsterImg.src = "assets/images/monster/monster-eat.png"; // 怪獸吃東西圖片 (建議尺寸：400x400)
    audioSys.trigger(audioSys.munch);
    element.style.display = 'none';

    setTimeout(() => {
        // 判斷當前關卡索引是否小於總關卡上限（注意：索引從 0 開始，所以要減 1）
        if (gameRuntime.currentLevelIndex < gameRuntime.maxLevels - 1) {
            gameRuntime.currentLevelIndex++;
            initMonsterLevel();
        } else {
            // 達到指定的總關卡上限，顯示大獲全勝通關畫面
            ui.bubble.innerHTML = "🎉 <span class='game-complete-text'>全部通關！</span> 怪獸肚子飽飽囉！";
        }
    }, 1500);
}

/**
 * 錯誤餵食彈回反饋
 * 用途：鎖定操作、播放失敗彈回特效聲，並透過流暢的貝茲曲線動畫將食物送回原本的位置
 * @param {HTMLElement} element - 餵食錯誤或未命中區域的食物節點元件
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
    // 網頁準備完畢，立刻依序初始化第一關的隨機出題
    initMonsterLevel();
    // 綁定重新開始按鈕點擊監聽器
    ui.restartBtn.addEventListener('click', restartGame);
});