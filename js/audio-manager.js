/**
 * 全站共用音訊管理器模組
 * 用途：集中管理全站背景音樂與點擊音效，提供統一的全域呼叫介面，消除各頁面重複撰寫音訊邏輯的問題
 */
(function () {
    'use strict';

    // 集中管理音訊路徑與快取鍵值
    const audioConfig = {
        storageKeyBgmTime: 'ebook_bgm_time',
        srcBgm: 'assets/audio/background.mp3',
        srcClick: 'assets/audio/click.mp3'
    };

    // 實例化全站唯一的背景音樂與點擊音效物件
    const bgmInstance = new Audio(audioConfig.srcBgm);
    const clickInstance = new Audio(audioConfig.srcClick);

    // 配置背景音樂基本屬性
    bgmInstance.loop = true;

    /**
     * 安全執行音訊播放
     * 用途：重設音訊時間戳並播放，自動捕捉並處理瀏覽器的自動播放限制政策，防止程式報錯卡死
     * @param {Audio} audioObj - 欲播放的 HTML5 Audio 實例物件
     */
    function safePlay(audioObj) {
        if (!audioObj) return;
        
        // 點擊音效需要每次重頭播放，背景音樂則由各自的邏輯控制時間軸，此處統一做重置安全處理
        if (audioObj !== bgmInstance) {
            audioObj.currentTime = 0;
        }

        audioObj.play().catch((error) => {
            console.warn("音訊播放受瀏覽器自動播放政策阻擋，已建立安全防呆略過，等待使用者操作解鎖:", error);
        });
    }

    /**
     * 儲存背景音樂目前的播放進度
     * 用途：將目前的播放秒數即時寫入本地儲存，以便跨頁面時能無縫接軌聆聽
     */
    function saveBgmProgress() {
        if (!bgmInstance.paused) {
            localStorage.setItem(audioConfig.storageKeyBgmTime, bgmInstance.currentTime);
        }
    }

    /**
     * 初始化與接續背景音樂
     * 用途：讀取歷史播放秒數並嘗試播放背景音樂，若被阻擋則綁定單次點擊事件隨時解鎖
     */
    function initBackgroundMusic() {
        const savedTime = localStorage.getItem(audioConfig.storageKeyBgmTime);
        if (savedTime) {
            bgmInstance.currentTime = parseFloat(savedTime);
        }

        bgmInstance.play().catch(() => {
            // 被瀏覽器限制時，監聽全域第一次點擊，由使用者主動解鎖音訊環境
            document.addEventListener('click', unlockAudioContext, { once: true });
        });
    }

    /**
     * 解鎖瀏覽器音訊限制
     * 用途：響應 W3C 規範，使用者點擊畫面的任意處時觸發背景音樂播放，並自動銷毀監聽釋放記憶體
     */
    function unlockAudioContext() {
        safePlay(bgmInstance);
    }

    /**
     * 暴露給全站頁面使用的公用音訊控制介面
     * 用途：將特定方法掛載至 window 物件，讓各網頁的獨立 JS 檔案能直接呼叫，不需重寫音訊實例
     */
    window.EbookAudio = {
        /**
         * 播放全站統一的點擊音效
         * 用途：提供給各頁面按鈕、互動元件點擊事件發生時直接調用
         */
        playClick: function () {
            safePlay(clickInstance);
        }
    };

    /**
     * 網頁初始化與卸載事件監聽
     * 用途：頁面載入完畢立刻接續背景音樂，並在使用者即將關閉或跳轉網頁前，將當前進度秒數存入快取
     */
    document.addEventListener('DOMContentLoaded', initBackgroundMusic);
    window.addEventListener('beforeunload', saveBgmProgress);
    // 每隔一秒背景同步時間，加強因極端環境未觸發 beforeunload 時的防線
    setInterval(saveBgmProgress, 1000);

})();