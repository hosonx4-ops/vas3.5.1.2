// electron/preload.ts
const { contextBridge, ipcRenderer, clipboard, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // API Giao tiếp mạng
    fetch: (url, cookie, options) =>
        ipcRenderer.invoke('fetch-api', { url, cookie, options }),

    // API Tự động hóa trình duyệt (AutoBrowser)
    startBrowserAutomation: (args) =>
        ipcRenderer.send('browser:start-automation', args),
    stopBrowserAutomation: () => ipcRenderer.send('browser:stop-automation'),

    // API Tạo Video từ Frames (I2V)
    videoCreateFromFrames: (args) =>
        ipcRenderer.send('video:create-from-frames', args),

    // V-- THÊM API MỚI CHO VIDEO MỞ RỘNG --V
    // "args" ở đây sẽ tự động bao gồm các trường mới (useInitialImage, etc.)
    // được truyền từ CreateExtendedVideoView.tsx
    startExtendedVideoAutomation: (args) => 
        ipcRenderer.send('extended-video:start', args),
    stopExtendedVideoAutomation: () => 
        ipcRenderer.send('extended-video:stop'),
    // ^-- THÊM API MỚI CHO VIDEO MỞ RỘNG --^

    // API Ghép video
    mergeVideos: (args) => ipcRenderer.invoke('merge-videos', args),
    selectVideoFiles: () => ipcRenderer.invoke('select-video-files'),
    stopMerge: () => ipcRenderer.invoke('stop-merge'),

    // API Tải file
    downloadVideo: (args) => ipcRenderer.send('download-video', args),
    downloadImage: (args) => ipcRenderer.send('download-image', args), // Giữ nguyên cho thumbnail
    selectDownloadDirectory: () => ipcRenderer.invoke('select-download-directory'),
    importPromptsFromFile: () => ipcRenderer.invoke('import-prompts-from-file'),
    importJsonPromptsFromFile: () => ipcRenderer.invoke('import-prompts-from-json'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // API Lưu ảnh (cho Whisk) - Đã cập nhật với promptIndex
    saveImageToDisk: (base64Data: string, savePath: string, filename: string, promptIndex: number) =>
        ipcRenderer.invoke('save-image-to-disk', { base64Data, savePath, filename, promptIndex }),

    // Listener cho các sự kiện từ Main Process
    onDownloadComplete: (callback) => {
        const listener = (_event, result) => callback(result);
        ipcRenderer.on('download-complete', listener);
        return () => ipcRenderer.removeListener('download-complete', listener);
    },
    
    // Listener cho AutoBrowser
    onBrowserLog: (callback) => {
        const listener = (_event, log) => callback(log);
        ipcRenderer.on('browser:log', listener);
        return () => ipcRenderer.removeListener('browser:log', listener);
    },

    // V-- LISTENER MỚI CHO VIDEO MỞ RỘNG --V
    onExtendedVideoLog: (callback) => {
        const listener = (_event, log) => callback(log);
        // Sử dụng một kênh (channel) mới
        ipcRenderer.on('extended-video:log', listener); 
        return () => ipcRenderer.removeListener('extended-video:log', listener);
    },
    // ^-- THÊM LISTENER MỚI CHO VIDEO MỞ RỘNG --^

    onCookieUpdate: (callback) => {
        const listener = (_event, cookie) => callback(cookie);
        ipcRenderer.on('browser:cookie-update', listener);
        return () => ipcRenderer.removeListener('browser:cookie-update', listener);
    },
    onNavigateToView: (callback) => {
        const listener = (_event, viewName) => callback(viewName);
        ipcRenderer.on('navigate-to-view', listener);
        return () => ipcRenderer.removeListener('navigate-to-view', listener);
    },
    onMergeProgress: (callback) => {
        const listener = (_event, progress) => callback(progress);
        ipcRenderer.on('merge-progress', listener);
        return () => ipcRenderer.removeListener('merge-progress', listener);
    },

    // API Tự động cập nhật
    checkForUpdates: () => ipcRenderer.send('check-for-updates'),
    onUpdateMessage: (callback) => {
        const listener = (_event, message, data) => callback(message, data);
        ipcRenderer.on('update-message', listener);
        return () => ipcRenderer.removeListener('update-message', listener);
    },
    restartAndInstall: () => ipcRenderer.send('restart-and-install'),

    forceReloadWindow: () => ipcRenderer.send('app:force-reload-window'),

    // API tiện ích
    copyText: (text) => clipboard.writeText(text),
    openExternalLink: (url) => shell.openExternal(url),

});