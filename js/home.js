/**
 * 幼兒電子書首頁專案邏輯
 * 採用標準不搞魔法、結構清晰的物件導向/模組化思維撰寫
 */

// 使用 立即執行函式 (IIFE) 封裝，避免污染全域變數，確保程式碼安全性
(function () {
    'use strict';

    // 集中管理所有的 DOM 元素參數，方便未來維護修改
    const config = {
        stageSelector: '.game-stage',
        btnStartId: 'btn-start',
        clickAudioId: 'click-audio',
        targetPage: 'game-monster.html',
        activeClass: 'is-loaded',
        soundFadeOutTime: 500 // 單位：毫秒
    };

    /**
     * 初始化網頁開場動畫
     * 用途：當 HTML 結構載入完成後，延遲賦予 CSS 類別以觸發雲朵散開特效
     */
    function initOpeningAnimation() {
        const stage = document.querySelector(config.stageSelector);
        if (!stage) return; // 防呆機制：找不到舞台就不執行

        // 延遲 200 毫秒後撥開雲朵，給予瀏覽器足夠的渲染緩衝時間，優化網站效能
        setTimeout(() => {
            stage.classList.add(config.activeClass);
        }, 200);
    }

    /**
     * 處理開始按鈕點擊事件與過場邏輯
     * 用途：負責播放點擊音效、防呆連續點擊，並在音效結束後安全導頁
     * @param {Event} event - 點擊事件物件
     */
    function handleStartClick(event) {
        // 阻止預防可能發生的重複觸發
        event.preventDefault();

        const btnStart = document.getElementById(config.btnStartId);
        const clickAudio = document.getElementById(config.clickAudioId);

        if (!btnStart) return;

        // 防呆邏輯：一旦點擊後立刻禁用按鈕，防止小孩子因為好玩快速連續連點導致瀏覽器崩潰
        btnStart.disabled = true;
        btnStart.style.pointerEvents = 'none';

        // 檢查瀏覽器是否支援音效並順利播放
        if (clickAudio) {
            // 每次點擊都重設音效時間，確保一定會發出聲音
            clickAudio.currentTime = 0;
            
            // 執行播放，並處理新型瀏覽器對音訊自動播放的限制政策 (Promise)
            clickAudio.play()
                .then(() => {
                    // 音效正常播放，等音效播完或特定延遲後導頁
                    setTimeout(() => {
                        navigateToGame();
                    }, config.soundFadeOutTime);
                })
                .catch((error) => {
                    // 防呆：如果瀏覽器封鎖了音訊播放，不卡死網頁，直接進行導頁
                    console.warn("音訊播放被瀏覽器阻擋:", error);
                    navigateToGame();
                });
        } else {
            // 找不到音訊檔案時的後援方案
            navigateToGame();
        }
    }

    /**
     * 執行頁面跳轉
     * 用途：安全地將玩家引導至下一個遊戲頁面
     */
    function navigateToGame() {
        window.location.href = config.targetPage;
    }

    /**
     * 綁定網頁事件監聽
     * 用途：揚棄 inline JS (onclick)，改用標準事件監聽器建構安全的前端環境
     */
    function bindEvents() {
        const btnStart = document.getElementById(config.btnStartId);
        if (btnStart) {
            btnStart.addEventListener('click', handleStartClick);
        }
    }

    /**
     * 程式總進入點
     * 用途：確保 DOM 樹生成完畢後才啟動 JS 邏輯
     */
    document.addEventListener('DOMContentLoaded', () => {
        initOpeningAnimation();
        bindEvents();
    });

})();