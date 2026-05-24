/**
 * 1 到 20 的英文字母對照字典表
 * 用途：集中管理數字與對應的英文單字，方便隨機抽題時對照文字
 */
const numberMap = {
    1: "one", 2: "two", 3: "three", 4: "four", 5: "five",
    6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten",
    11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen",
    16: "sixteen", 17: "seventeen", 18: "eighteen", 19: "nineteen", 20: "twenty"
};

/**
 * 關卡基礎控制狀態表
 * 用途：管理目前的關卡進度與出題狀態，未來想要變更總關卡數，直接修改 maxLevels 的數值即可
 */
const trainSystem = {
    currentLevel: 0,
    maxLevels: 13,             // 遊戲總關卡數
    maxWrongOption: 10,        // 遊戲錯誤選項數
    targetNumber: 0,
    correctAnswerString: "",
    isTransitioning: false
};

/**
 * 緩存 DOM 網頁節點
 * 用途：集中管理網頁元件，提升系統執行效能
 */
const view = {
    levelIndicator: document.getElementById('train-level'),
    maxLevelIndicator: document.getElementById('train-max-level'), // 新增：用來動態更新 HTML 總關卡數的節點
    bubbleBox: document.getElementById('train-bubble'),
    numDisplay: document.getElementById('target-number-display'),
    trainObj: document.getElementById('train-character'),
    optionsWrapper: document.getElementById('options-container'),
    restartBtn: document.getElementById('btn-restart')
};

/**
 * 集中管理本頁專屬互動音效
 * 用途：負責處理答對與答錯的局部特效音，原 click 點擊聲已改由全站公用管理器 EbookAudio 控管
 */
const soundEffect = {
    success: new Audio('assets/audio/train/success.mp3'),
    fail: new Audio('assets/audio/boing.mp3'),
    
    /**
     * 安全執行音效播放
     * 用途：將特效音訊進度歸零並即時播放，同時捕捉瀏覽器自動播放限制防止程式當掉
     * @param {Audio} soundObj - 欲播放的 HTML5 Audio 特效音實例物件
     */
    play: function(soundObj) {
        if (!soundObj) return;
        soundObj.currentTime = 0;
        soundObj.play().catch(() => {});
    }
};

/**
 * 產生 1 到 20 的隨機數字，並運用最基礎的迴圈組裝與打散干擾選項
 * 用途：隨機抽選本關卡題目，並將設定好的最大關卡數自動渲染到 HTML 畫面上
 */
function buildTrain() {
    trainSystem.isTransitioning = false;
    
    // 更新畫面的當前關卡與總關卡數字，這樣 HTML 的數字就會跟隨 JS 變數自動改變
    view.levelIndicator.textContent = trainSystem.currentLevel + 1;
    if (view.maxLevelIndicator) {
        view.maxLevelIndicator.textContent = trainSystem.maxLevels;
    }

    // 將發問區塊還原為初始文字結構，移除可能殘留的通關結算字樣
    view.bubbleBox.innerHTML = `請找出正確的數字單字：<span id="target-number-display">${trainSystem.targetNumber}</span>`;
    view.numDisplay = document.getElementById('target-number-display');

    // 隨機抽選一題 1~20 的主數字
    trainSystem.targetNumber = Math.floor(Math.random() * 20) + 1;
    trainSystem.correctAnswerString = numberMap[trainSystem.targetNumber];

    view.numDisplay.textContent = trainSystem.targetNumber;
    view.optionsWrapper.innerHTML = "";

    // 建立一個空的錯誤答案陣列庫，用最基礎的迴圈篩選出非正確答案的單字
    const wrongPool = [];
    for (const key in numberMap) {
        const textValue = numberMap[key];
        if (textValue !== trainSystem.correctAnswerString) {
            wrongPool.push(textValue);
        }
    }
    
    // 用基礎的計數迴圈，隨機挑選出兩個不重複的錯誤單字
    const selectedWrong = [];
    while (selectedWrong.length < trainSystem.maxWrongOption) {
        const randIndex = Math.floor(Math.random() * wrongPool.length);
        const choice = wrongPool[randIndex];
        
        // 檢查選出的錯誤單字是否已經存在於陣列中
        let isExist = false;
        for (let k = 0; k < selectedWrong.length; k++) {
            if (selectedWrong[k] === choice) {
                isExist = true;
            }
        }
        
        // 如果不存在，則把這個錯誤單字放入干擾清單中
        if (isExist === false) {
            selectedWrong.push(choice);
        }
    }

    // 建立總選項清單，將正確答案與兩個隨機錯誤單字裝在一起
    const choicesList = [];
    choicesList.push(trainSystem.correctAnswerString);
    choicesList.push(selectedWrong[0]);
    choicesList.push(selectedWrong[1]);
    
    // 用最傳統的交換暫存變數方式將三個選項進行隨機洗牌打散
    for (let i = choicesList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tempValue = choicesList[i];
        choicesList[i] = choicesList[j];
        choicesList[j] = tempValue;
    }

    // 用基礎迴圈建立按鈕，動態渲染至畫面上
    for (let i = 0; i < choicesList.length; i++) {
        const textWord = choicesList[i];
        const btn = document.createElement('button');
        btn.classList.add('kids-alpha-btn');
        btn.textContent = textWord;

        btn.addEventListener('click', () => {
            evaluateUserChoice(textWord, btn);
        });

        view.optionsWrapper.appendChild(btn);
    }
}

/**
 * 重置整個數字火車遊戲狀態回到第一關，並將火車推回起點
 * 用途：重置狀態機關卡進度，將火車位置強制拉回起點左邊 5% 的位置
 */
function restartTrainGame() {
    // 防呆控制：若火車正處於換關中或答錯晃動动画中，則禁止重複點擊
    if (trainSystem.isTransitioning) return;

    if (window.EbookAudio && typeof window.EbookAudio.playClick === 'function') {
        window.EbookAudio.playClick();
    }
    
    trainSystem.currentLevel = 0;
    
    // 火車大盒子 (建議圖片尺寸：500x300 像素透明背景火車 PNG)
    view.trainObj.style.left = "5%";
    
    buildTrain();
}

/**
 * 評估幼兒點選的選項是否正確
 * 用途：比對點選的文字與正確答案，據此動態計算步伐驅動火車前進，或觸發答錯晃動
 * @param {string} chosenWord - 被使用者選取的數字英文名稱字串
 * @param {HTMLButtonElement} buttonNode - 被點取的按鈕 HTML 網頁節點
 */
function evaluateUserChoice(chosenWord, buttonNode) {
    if (trainSystem.isTransitioning) return;

    if (window.EbookAudio && typeof window.EbookAudio.playClick === 'function') {
        window.EbookAudio.playClick();
    }

    if (chosenWord === trainSystem.correctAnswerString) {
        trainSystem.isTransitioning = true;
        soundEffect.play(soundEffect.success);
        
        buttonNode.classList.add('correct-state');

        // 自動等分公式：起始點為 5%，終點為 85%，中間依據總關卡數自動計算比例
        const startPos = 5;
        const endPos = 85;
        const totalSteps = trainSystem.maxLevels;
        const currentStepIndex = trainSystem.currentLevel + 1;
        
        // 算出火車當前關卡應該前進的精準動態百分比座標
        const targetPercent = startPos + ((endPos - startPos) / totalSteps) * currentStepIndex;
        view.trainObj.style.left = targetPercent + "%";

        setTimeout(() => {
            if (trainSystem.currentLevel < trainSystem.maxLevels - 1) {
                trainSystem.currentLevel++;
                buildTrain();
            } else {
                view.bubbleBox.innerHTML = "🚇<span class='game-complete-text'>火車站抵達！</span> 數字火車任務成功！";
                view.optionsWrapper.innerHTML = "";
                trainSystem.isTransitioning = false;
            }
        }, 1200);

    } else {
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
    view.restartBtn.addEventListener('click', restartTrainGame);
});