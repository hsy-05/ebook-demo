/**
 * 1 到 20 的英文字母對照字典表
 */
const numberMap = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
    6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
    11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen",
    16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen", 20: "twenty"
};

/**
 * 關卡基礎控制狀態
 */
const trainSystem = {
    currentLevel: 0,
    maxLevels: 3,
    targetNumber: 0,
    correctAnswerString: "",
    isTransitioning: false
};

/**
 * 緩存 DOM 節點
 */
const view = {
    levelIndicator: document.getElementById('train-level'),
    bubbleBox: document.getElementById('train-bubble'),
    numDisplay: document.getElementById('target-number-display'),
    trainObj: document.getElementById('train-character'),
    optionsWrapper: document.getElementById('options-container'),
    restartBtn: document.getElementById('btn-restart')
};

/**
 * 音效驅動元件
 */
const soundEffect = {
    click: new Audio('assets/audio/click.mp3'),
    success: new Audio('assets/audio/train/success.mp3'),
    fail: new Audio('assets/audio/boing.mp3'),
    
    /**
     * 安全執行音效播放
     * @param {Audio} soundObj - Audio 元件
     */
    play: function(soundObj) {
        soundObj.currentTime = 0;
        soundObj.play().catch(() => {});
    }
};

/**
 * 產生 1 到 20 的隨機數字，並運用 Fisher-Yates 演算法動態組裝干擾選項
 */
function buildTrain() {
    trainSystem.isTransitioning = false;
    view.levelIndicator.textContent = trainSystem.currentLevel + 1;

    // 將題目發問區塊的文字還原為初始狀態，清除可能殘留的通關結算文字
    view.bubbleBox.innerHTML = `請找出正確的數字單字：<span id="target-number-display">${trainSystem.targetNumber}</span>`;
    // 重新抓取因載入 innerHTML 而產生的新數字節點快取
    view.numDisplay = document.getElementById('target-number-display');

    // 隨機抽選一題 1~20 的主數字
    trainSystem.targetNumber = Math.floor(Math.random() * 20) + 1;
    trainSystem.correctAnswerString = numberMap[trainSystem.targetNumber];

    view.numDisplay.textContent = trainSystem.targetNumber;
    view.optionsWrapper.innerHTML = "";

    // 過濾出錯誤答案庫
    const wrongPool = Object.values(numberMap).filter(val => val !== trainSystem.correctAnswerString);
    
    // 隨機選出兩個錯誤單字
    const selectedWrong = [];
    while(selectedWrong.length < 2) {
        const randIndex = Math.floor(Math.random() * wrongPool.length);
        const choice = wrongPool[randIndex];
        if(!selectedWrong.includes(choice)) {
            selectedWrong.push(choice);
        }
    }

    // 結合正確與錯誤答案，進行洗牌
    const choicesList = [trainSystem.correctAnswerString, ...selectedWrong];
    
    // Fisher-Yates 洗牌演算法實作
    for (let i = choicesList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choicesList[i], choicesList[j]] = [choicesList[j], choicesList[i]];
    }

    // 將隨機化排序後的選項渲染成幼兒按鈕
    choicesList.forEach(textWord => {
        const btn = document.createElement('button');
        btn.classList.add('kids-alpha-btn');
        btn.textContent = textWord;

        btn.addEventListener('click', () => {
            evaluateUserChoice(textWord, btn);
        });

        view.optionsWrapper.appendChild(btn);
    });
}

/**
 * 重置整個數字火車遊戲狀態回到第一關，並將火車推回起點
 */
function restartTrainGame() {
    // 如果是「通關大獲全勝」的狀態（此時會卡在關卡 3 且已經過渡完畢），我們強制允許重置
    if (trainSystem.currentLevel === trainSystem.maxLevels - 1 && view.optionsWrapper.innerHTML === "") {
        trainSystem.isTransitioning = false;
    }

    // 防呆控制：若火車真的正處於答錯晃動或前進動畫中，則不允許觸發重置
    if (trainSystem.isTransitioning) return;

    soundEffect.play(soundEffect.click);
    trainSystem.currentLevel = 0;
    
    // 將火車骨架的 left 屬性直接強制歸零回初始起點位置 5%
    view.trainObj.style.left = "5%";
    
    buildTrain();
}

/**
 * 評估幼兒點選的選項是否正確
 * @param {string} chosenWord - 被選取的字串
 * @param {HTMLButtonElement} buttonNode - 被點取的 DOM 節點
 */
function evaluateUserChoice(chosenWord, buttonNode) {
    if (trainSystem.isTransitioning) return;

    if (chosenWord === trainSystem.correctAnswerString) {
        // 答對邏輯
        trainSystem.isTransitioning = true;
        soundEffect.play(soundEffect.success);
        
        // 加上已定義的正確外觀類別，全面阻絕 style 屬性內聯殘留
        buttonNode.classList.add('correct-state');

        // 火車隨著進度步進
        const levelSteps = ["25%", "55%", "80%"];
        view.trainObj.style.left = levelSteps[trainSystem.currentLevel];

        setTimeout(() => {
            if (trainSystem.currentLevel < trainSystem.maxLevels - 1) {
                trainSystem.currentLevel++;
                buildTrain();
            } else {
                // 答對通關文字改由 CSS Class 控制，移去所有的內聯 inline 樣式
                view.bubbleBox.innerHTML = "🚇<span class='game-complete-text'>火車站抵達！</span> 數字火車任務成功！";
                view.optionsWrapper.innerHTML = "";
                // 核心修正：大獲全勝後解開動畫狀態鎖，讓重新開始按鈕恢復點擊功能
                trainSystem.isTransitioning = false;
            }
        }, 1200);

    } else {
        // 答錯邏輯：防呆與火車搖頭晃動
        trainSystem.isTransitioning = true;
        soundEffect.play(soundEffect.fail);
        view.trainObj.classList.add('shake-animation');

        setTimeout(() => {
            view.trainObj.classList.remove('shake-animation');
            trainSystem.isTransitioning = false;
        }, 500);
    }
}

// 核心初始化監聽
document.addEventListener('DOMContentLoaded', () => {
    buildTrain();
    // 綁定控制項重置點擊監聽器，拒絕 inline onclick 寫法
    view.restartBtn.addEventListener('click', restartTrainGame);
});