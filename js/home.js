/**
 * 幼兒電子書首頁專案邏輯
 * 採用標準不搞魔法、結構清晰的物件導向/模組化思維撰寫
 */

// 使用 立即執行函式 (IIFE) 封裝，避免污染全域變數，確保程式碼安全性
(function () {
    'use strict';

    // 集中管理所有的 DOM 元素選取參數，方便未來變更維護
    const config = {
        stageSelector: '.game-stage',
        btnStartId: 'btn-start',
        targetPage: 'game-monster.html',
        activeClass: 'is-loaded',
        soundFadeOutTime: 500 // 單位：毫秒
    };

    /**
     * 緩存 DOM 節點物件
     * 用途：集中管理頁面中需要頻繁操作的網頁元件，提升網頁運作效能
     */
    const view = {
        stage: document.querySelector(config.stageSelector),
        btnStart: document.getElementById(config.btnStartId)
    };

    /**
     * 初始化網頁開場動畫
     * 用途：當網頁結構與基礎樣式準備完畢，延遲注入指定 CSS Class 以驅動雲朵朝兩側散開的迎賓特效
     */
    function initOpeningAnimation() {
        if (!view.stage) return; // 防呆機制：若頁面找不到指定主舞台節點，則提前中斷不報錯

        // 延遲 200 毫秒後為舞台加上 class，帶給瀏覽器更從容的渲染緩衝時間，確保手機動畫流暢不破版
        setTimeout(() => {
            view.stage.classList.add(config.activeClass);
        }, 200);
    }

    /**
     * 處理開始按鈕點擊事件與過場導頁
     * 用途：防範重複點擊損耗效能，調用共用音訊模組播放音效，並於音效淡出指定時間後將玩家安全引導至下一頁
     * @param {Event} event - 系統傳入的點擊事件實例物件
     */
    function handleStartClick(event) {
        // 阻斷預設的連動行為，確保不發生非預期的多次觸發
        event.preventDefault();

        if (!view.btnStart) return; // 防呆機制：找不到開始按鈕則直接返回

        // 防呆邏輯：按鈕觸發後立即停用點擊狀態並鎖定滑鼠事件，徹底阻絕幼兒連續快點造成頁面崩潰或多次導頁
        view.btnStart.disabled = true;
        view.btnStart.style.pointerEvents = 'none';

        // 直接調用全站共用音訊模組，播放點擊反饋聲響，各頁面皆免重寫 Audio
        if (window.EbookAudio && typeof window.EbookAudio.playClick === 'function') {
            window.EbookAudio.playClick();
        }

        // 停留指定的時間緩衝（靜待音效完整呈現），再行安全跳轉頁面
        setTimeout(() => {
            navigateToGame();
        }, config.soundFadeOutTime);
    }

    /**
     * 執行頁面跳轉
     * 用途：將目前瀏覽器畫面網址變更至指定的怪獸遊戲主頁面
     */
    function navigateToGame() {
        window.location.href = config.targetPage;
    }

    /**
     * 綁定網頁事件監聽器
     * 用乎：全面揚棄行內標籤式 onclick 寫法，採用現代標準 W3C 事件監聽器建立純淨且安全的前端執行環境
     */
    function bindEvents() {
        if (view.btnStart) {
            view.btnStart.addEventListener('click', handleStartClick);
        }
    }

    /**
     * 程式主要啟動進入點
     * 用途：確保網頁文件（DOM 樹）完整生成並加載後，方依序依從上到下的原則啟動動畫與監聽綁定
     */
    document.addEventListener('DOMContentLoaded', () => {
        initOpeningAnimation();
        bindEvents();
    });

})();