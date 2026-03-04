// ==UserScript==
// @name         AMQ Return Library Video
// @namespace    https://github.com/EasterEchidna
// @version      1.0.0
// @description  Removed sample limits and brought back video. Two modes: Audio and Video. Worked in both Quiz Builder and Song Library.
// @author       EasterEchidna
// @match        https://animemusicquiz.com/*
// @grant        none
// @downloadURL  https://github.com/easterechidna/amq-scripts/raw/main/amqReturnLibraryVideo.user.js
// @updateURL    https://github.com/easterechidna/amq-scripts/raw/main/amqReturnLibraryVideo.user.js
// ==/UserScript==

if (document.getElementById('startPage')) {
    return;
}

let loadInterval = setInterval(() => {
    if (typeof PreviewVideoPlayer !== 'undefined' && typeof LibrarySongEntry !== 'undefined') {
        clearInterval(loadInterval);
        setupMediaUnlock();
    }
}, 500);

function setupMediaUnlock() {
    // Remove limits
    PreviewVideoPlayer.prototype.PLAY_LENGTH = 999999;
    PreviewVideoPlayer.prototype.SAMPLE_TARGET_POINT = 0;
    if (!document.getElementById('amqRlvStyles')) {
        let style = document.createElement('style');
        style.id = 'amqRlvStyles';
        style.innerHTML = `
            .amq-rlv-active {
                position: fixed !important; bottom: 45px !important;
                transform: none !important; right: auto !important;
                display: flex !important; flex-wrap: wrap !important; z-index: 9999 !important;
                border-radius: 10px 10px 0 0 !important; padding: 12px 15px !important; box-sizing: border-box !important;
                transition: none !important; box-shadow: none !important;
            }
            .amq-rlv-active .elSamplePlayerVideo {
                display: block !important; width: 100% !important; height: auto !important; aspect-ratio: 16 / 9 !important;
                background-color: #000 !important; visibility: visible !important; opacity: 1 !important; order: 99 !important;
                flex-basis: 100% !important; margin-top: 10px !important; position: relative !important;
            }
            .amq-rlv-active.mode-audio video, .amq-rlv-active.mode-audio .vjs-tech {
                display: none !important;
            }
            .amq-rlv-active.mode-video #amqRlvAudioOverlay {
                display: none !important;
            }
            .amq-rlv-active.mode-video video, .amq-rlv-active.mode-video .vjs-tech {
                display: block !important; width: 100% !important; height: 100% !important;
                object-fit: contain !important; visibility: visible !important; opacity: 1 !important; position: relative !important;
            }
            #amqRlvTimeTooltip {
                position: fixed; background: rgba(0,0,0,0.85); color: #fff; font-size: 11px; padding: 4px 8px;
                border-radius: 4px; pointer-events: none; opacity: 0; z-index: 2147483647;
                transform: translateX(-50%); white-space: nowrap; transition: opacity 0.1s;
            }
        `;
        document.head.appendChild(style);
    }

    // Global tooltip
    let tooltip = document.createElement('div');
    tooltip.id = 'amqRlvTimeTooltip';
    document.body.appendChild(tooltip);

    let fmtTime = (s) => {
        if (!s || isNaN(s)) return '0:00';
        let m = Math.floor(s / 60);
        let sec = Math.floor(s % 60);
        return m + ':' + (sec < 10 ? '0' : '') + sec;
    };

    let isHoveringBar = false;
    let knobElement = null;

    document.addEventListener('mouseover', (e) => {
        let container = e.target.closest('.elSamplePlayerControllerProgressBarContainer');
        if (container) {
            isHoveringBar = true;
            tooltip.style.opacity = '1';
            // Strict knob lookup
            knobElement = container.querySelector('.elSamplePlayerControllerProgressBarInnerEnd');
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('.elSamplePlayerControllerProgressBarContainer')) {
            setTimeout(() => {
                if (!document.querySelector('.elSamplePlayerControllerProgressBarContainer:hover')) {
                    isHoveringBar = false;
                    tooltip.style.opacity = '0';
                    knobElement = null;
                }
            }, 10);
        }
    });
    function updateLoop() {
        // Update tooltip
        if (isHoveringBar && window.amqRlvCurrentPlayer && window.amqRlvCurrentPlayer.player && knobElement) {
            let player = window.amqRlvCurrentPlayer.player;
            let cur = player.currentTime() || 0;
            let dur = player.duration() || 0;
            tooltip.textContent = fmtTime(cur) + ' / ' + fmtTime(dur);

            let rect = knobElement.getBoundingClientRect();
            // Skip hidden knob
            if (rect.width > 0) {
                tooltip.style.left = (rect.left + rect.width / 2) + 'px';
                tooltip.style.top = (rect.top - 28) + 'px';
            }
        }

        // Lock UI & check parent
        if (window.amqRlvCurrentController && window.amqRlvCurrentController.classList.contains('amq-rlv-active')) {
            let libraryPanel = window.amqRlvCurrentController.closest('.popover') || window.amqRlvCurrentController.parentElement;

            if (libraryPanel && libraryPanel.isConnected && libraryPanel.getBoundingClientRect().width > 0) {
                let rect = libraryPanel.getBoundingClientRect();
                window.amqRlvCurrentController.style.setProperty('width', rect.width + 'px', 'important');
                window.amqRlvCurrentController.style.setProperty('left', rect.left + 'px', 'important');
            } else {
                try {
                    if (window.amqRlvCurrentPlayer && window.amqRlvCurrentPlayer.pauseVideo) {
                        window.amqRlvCurrentPlayer.pauseVideo();
                    }
                } catch (e) { }

                window.amqRlvCurrentController.style.setProperty('transition', 'none', 'important');
                window.amqRlvCurrentController.style.setProperty('transform', 'translateY(115%)', 'important');
                window.amqRlvCurrentController.classList.remove('open', 'amq-rlv-active');
                window.amqRlvCurrentController = null;
            }
        }

        requestAnimationFrame(updateLoop);
    }
    requestAnimationFrame(updateLoop);

    // Hook socket
    if (typeof socket !== 'undefined' && socket.sendCommand) {
        const originalSendCommand = socket.sendCommand;
        socket.sendCommand = function (payload) {
            if (payload.type === "library" && payload.command === "get song extended info") {
                if (payload.data) {
                    payload.data.includeFileNames = true;
                }
            }
            return originalSendCommand.apply(this, arguments);
        };
    }

    // Video fallbacks
    const originalSetupExtendedInfo = LibrarySongEntry.prototype.setupExtendedInfo;
    LibrarySongEntry.prototype.setupExtendedInfo = function () {
        if (this.extendedInfo) {
            window.amqRlvUrlMap = window.amqRlvUrlMap || {};
            let originalAudioUrl = this.extendedInfo.fileName;

            if (this.extendedInfo.fileNameMap) {
                let videos = [];
                let resList = Object.keys(this.extendedInfo.fileNameMap).map(n => parseInt(n)).sort((a, b) => b - a);
                resList.forEach(res => {
                    if (res > 0) videos.push(this.extendedInfo.fileNameMap[res]);
                });
                window.amqRlvUrlMap[originalAudioUrl] = { audio: originalAudioUrl, videos: videos };
            }
        }
        return originalSetupExtendedInfo.apply(this, arguments);
    };

    // Intercept play & build UI
    if (typeof LibraryPreviewPlayerController !== 'undefined') {
        const originalPlaySong = LibraryPreviewPlayerController.prototype.playSong;
        LibraryPreviewPlayerController.prototype.playSong = function (fileName, meanVolume, playChangeCallback) {

            window.amqRlvCurrentPlayer = this.videoPlayer;
            let currentMediaMode = localStorage.getItem('amqReturnLibraryVideoMode') || 'video';

            let targetFile = fileName;
            let fallbackUrls = [fileName];

            if (window.amqRlvUrlMap && window.amqRlvUrlMap[fileName]) {
                let mapEntry = window.amqRlvUrlMap[fileName];
                if (currentMediaMode === 'video' && mapEntry.videos.length > 0) {
                    targetFile = mapEntry.videos[0];
                    fallbackUrls = [...mapEntry.videos, mapEntry.audio];
                } else {
                    targetFile = mapEntry.audio;
                    fallbackUrls = [mapEntry.audio];
                }
            }

            window.amqRlvCurrentFallbackList = fallbackUrls;

            let args = Array.from(arguments);
            args[0] = targetFile;
            let result = originalPlaySong.apply(this, args);

            // Error catcher
            if (this.videoPlayer && this.videoPlayer.player) {
                let player = this.videoPlayer.player;
                player.off('error');

                let currentErrorIndex = 0;
                player.on('error', () => {
                    let err = player.error();
                    if (err && window.amqRlvCurrentFallbackList && currentErrorIndex < window.amqRlvCurrentFallbackList.length - 1) {
                        currentErrorIndex++;
                        let nextFile = window.amqRlvCurrentFallbackList[currentErrorIndex];
                        player.error(null);
                        player.src(nextFile);
                        player.play();
                    }
                });
            }

            // Restructure UI
            if (this.$container && this.$container.length) {
                let controllerEl = this.$container[0];
                window.amqRlvCurrentController = controllerEl;

                // Clear hidden state
                controllerEl.style.removeProperty('transform');
                controllerEl.style.removeProperty('transition');

                controllerEl.classList.add('amq-rlv-active');
                controllerEl.classList.remove('mode-video', 'mode-audio');
                controllerEl.classList.add(`mode-${currentMediaMode}`);

                // Settings button
                if (!controllerEl.querySelector('#amqRlvSettingsBtn')) {
                    let settingsWrap = document.createElement('div');
                    settingsWrap.id = 'amqRlvSettingsBtn';
                    settingsWrap.style.cssText = `position: relative; order: 9; margin-left: auto; display: flex; align-items: center;`;

                    let gearIcon = document.createElement('div');
                    gearIcon.innerHTML = '<i class="fa fa-cog" aria-hidden="true"></i>';
                    gearIcon.style.cssText = `cursor: pointer; color: rgba(255,255,255,0.7); font-size: 20px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; transition: color 0.2s;`;
                    gearIcon.addEventListener('mouseenter', () => gearIcon.style.color = '#fff');
                    gearIcon.addEventListener('mouseleave', () => gearIcon.style.color = 'rgba(255,255,255,0.7)');

                    let dropdownWrapper = document.createElement('div');
                    dropdownWrapper.style.cssText = `position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%); padding-bottom: 8px; min-width: 90px; opacity: 0; pointer-events: none; transition: opacity 0.15s; z-index: 10000;`;

                    let dropdownInner = document.createElement('div');
                    dropdownInner.style.cssText = `background: rgba(30,30,30,0.95); border-radius: 6px; padding: 4px 0; box-shadow: 0 2px 8px rgba(0,0,0,0.5);`;

                    ['video', 'audio'].forEach(mode => {
                        let item = document.createElement('div');
                        item.textContent = mode === 'video' ? 'Video' : 'Audio';
                        item.dataset.mode = mode;
                        item.style.cssText = `padding: 6px 14px; cursor: pointer; color: ${currentMediaMode === mode ? '#4fc3f7' : 'rgba(255,255,255,0.8)'}; font-size: 14px; white-space: nowrap; text-align: center; transition: background 0.15s;`;
                        item.addEventListener('mouseenter', () => item.style.background = 'rgba(255,255,255,0.1)');
                        item.addEventListener('mouseleave', () => item.style.background = 'none');
                        item.addEventListener('click', (e) => {
                            e.stopPropagation();
                            localStorage.setItem('amqReturnLibraryVideoMode', mode);
                            controllerEl.classList.remove('mode-video', 'mode-audio');
                            controllerEl.classList.add(`mode-${mode}`);
                            dropdownInner.querySelectorAll('div').forEach(d => {
                                d.style.color = d.dataset.mode === mode ? '#4fc3f7' : 'rgba(255,255,255,0.8)';
                            });
                        });
                        dropdownInner.appendChild(item);
                    });

                    dropdownWrapper.appendChild(dropdownInner);
                    settingsWrap.appendChild(gearIcon);
                    settingsWrap.appendChild(dropdownWrapper);

                    settingsWrap.addEventListener('mouseenter', () => { dropdownWrapper.style.opacity = '1'; dropdownWrapper.style.pointerEvents = 'auto'; });
                    settingsWrap.addEventListener('mouseleave', () => { dropdownWrapper.style.opacity = '0'; dropdownWrapper.style.pointerEvents = 'none'; });
                    controllerEl.appendChild(settingsWrap);
                }

                // Close button
                if (!controllerEl.querySelector('#amqRlvVideoCloseBtn')) {
                    let closeBtn = document.createElement('div');
                    closeBtn.id = 'amqRlvVideoCloseBtn';
                    closeBtn.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
                    closeBtn.style.cssText = `cursor: pointer; color: rgba(255,255,255,0.7); background: none; border: none; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 24px; pointer-events: auto; transition: color 0.2s; margin-left: 10px; order: 11;`;
                    closeBtn.addEventListener('mouseenter', () => closeBtn.style.color = '#fff');
                    closeBtn.addEventListener('mouseleave', () => closeBtn.style.color = 'rgba(255,255,255,0.7)');
                    closeBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (this.videoPlayer) this.videoPlayer.pauseVideo();
                        controllerEl.style.setProperty('transition', 'none', 'important');
                        controllerEl.style.setProperty('transform', 'translateY(115%)', 'important');
                        controllerEl.classList.remove('open', 'amq-rlv-active');
                        window.amqRlvCurrentController = null;
                    });
                    controllerEl.appendChild(closeBtn);
                }

                // Audio overlay
                let videoEl = controllerEl.querySelector('.elSamplePlayerVideo');
                if (videoEl) {
                    videoEl.classList.remove('hide', 'vjs-hidden', 'vjs-audio');
                    if (!videoEl.querySelector('#amqRlvAudioOverlay')) {
                        let overlay = document.createElement('div');
                        overlay.id = 'amqRlvAudioOverlay';
                        overlay.textContent = 'Audio Only';
                        overlay.style.cssText = `position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.4); font-size: 24px; font-weight: 300; letter-spacing: 2px; pointer-events: none; user-select: none;`;
                        videoEl.appendChild(overlay);
                    }
                }
            }

            // Strip VJS restrictions
            if (this.videoPlayer && this.videoPlayer.player) {
                this.videoPlayer.player.removeClass('vjs-audio');
                this.videoPlayer.player.removeClass('vjs-hidden');
                this.videoPlayer.player.removeClass('hide');
            }

            return result;
        };
    }
}