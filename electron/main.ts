// electron/main.ts
import { app, BrowserWindow, screen as electronScreen, ipcMain, dialog, session } from 'electron';
import path from 'path';
import fs from 'fs'; // Đảm bảo import fs
import { autoUpdater } from 'electron-updater';
import ffmpeg from 'fluent-ffmpeg';

// Biến điều khiển
let stopAutomationFlag = false;
let stopExtendedVideoFlag = false; // Biến dừng cho video mở rộng
const STATUS_CHECK_INTERVAL = 3000; // Cập nhật trạng thái mỗi 3 giây
let ffmpegCommand: ffmpeg.FfmpegCommand | null = null;

// Biến toàn cục cho cửa sổ chính
let mainWindow: BrowserWindow | null = null;

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const isDev = !!VITE_DEV_SERVER_URL;

// Ánh xạ URL API tới mã lỗi
const apiErrorMap = new Map<string, string>([
    ['https://mmoreal.com/api/prf.php', 'E001'],
    ['https://labs.google/fx/api/trpc/project.createProject', 'E002'],
    ['https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText', 'E003'],
    ['https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus', 'E004'],
    ['https://aisandbox-pa.googleapis.com/v1:uploadUserImage', 'E005'],
    ['https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartAndEndImage', 'E006'],
    ['https://labs.google/fx/api/trpc/media.createOrUpdateWorkflow', 'E007'],
    ['https://aisandbox-pa.googleapis.com/v1/whisk:generateImage', 'E008'], // Thêm endpoint whisk
    ['https://aisandbox-pa.googleapis.com/v1/whisk:runImageRecipe', 'E008'], // Thêm endpoint whisk recipe
    ['https://labs.google/fx/api/trpc/backbone.uploadImage', 'E007'], // Thêm endpoint upload whisk
    ['https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage', 'E009']
]);

// =================================================================
// 1. CÁC HÀM TIỆN ÍCH VÀ API
// =================================================================

// CẬP NHẬT: handleApiRequest (Thêm logic Whisk)
async function handleApiRequest(_event: any, { url, cookie, options }: any) {
  try {
    const targetUrl = new URL(url);

    let headers: any = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Origin": "https://labs.google",
      "Referer": "https://labs.google/",
      ...options.headers
    };

    if (!headers['Content-Type'] && !url.includes('/whisk:')) {
        headers['Content-Type'] = 'application/json';
    } else if (url.includes('/whisk:')) {
        headers['Content-Type'] = 'text/plain;charset=UTF-8';
    }

    if (cookie && cookie.bearerToken) {
        let token = cookie.bearerToken;
        const secretSuffix = '-gCktgGis5K8si7sJ8sTKdHdsaHK84s';
        if (token.endsWith(secretSuffix)) {
            token = token.slice(0, -secretSuffix.length);
        }

        const finalToken = token.startsWith('Bearer ')
            ? token.substring(7)
            : token;
        headers['Authorization'] = `Bearer ${finalToken}`;
    }

    if (cookie && cookie.value) {
        headers['Cookie'] = cookie.value;
    }

    if (targetUrl.hostname === "aisandbox-pa.googleapis.com" && !url.includes(':uploadUserImage')) {
        if (!headers['Authorization']) {
            throw new Error("Bearer Token is required for aisandbox API.");
        }
    }

    const body = typeof options.body === "object" && !url.includes('/whisk:')
      ? JSON.stringify(options.body)
      : options.body;


    const response = await fetch(url, { ...options, headers, body });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("API Error Response:", errorText);
      const errorCode = apiErrorMap.get(url) || 'UNKNOWN_API';
      const error: any = new Error(`${response.status} (${errorCode})`);
      error.statusCode = response.status;
      error.details = errorText;
      throw error;
    }

    const text = await response.text();
    const contentType = response.headers.get('content-type');
    if (text && contentType && contentType.includes('application/json')) {
         return JSON.parse(text);
    } else if (text && url.includes('/whisk:')) {
         try {
             return JSON.parse(text);
         } catch {
             if (text.toLowerCase().includes('error')) {
                 const errorCode = apiErrorMap.get(url) || 'WHISK_ERROR';
                 const error: any = new Error(`${response.status} (${errorCode}) - Whisk Error`);
                 error.statusCode = response.status;
                 error.details = text;
                 throw error;
             }
             console.warn("Whisk API response was not JSON:", text);
             return { rawText: text };
         }
    } else if (text) {
         return JSON.parse(text);
    } else {
         return {};
    }

  } catch (error: any) {
    const errorCode = apiErrorMap.get(url) || 'NETWORK_ERROR';
    console.error(`Failed to fetch ( ${errorCode})`, error.details ? `Details: ${error.details}` : error);
    const detailString = error.details ? ` - API Response: ${error.details}` : '';
    throw new Error(`(${errorCode}): ${error.message}${detailString}`);
  }
}

ipcMain.on("browser:stop-automation", () => {
  console.log("Received stop automation signal.");
  stopAutomationFlag = true;
});

// Hàm lưu ảnh (cho Whisk) với promptIndex
ipcMain.handle('save-image-to-disk', async (event, { base64Data, savePath, filename, promptIndex }) => {
    try {
        if (!savePath || !filename) {
            throw new Error('Đường dẫn lưu hoặc tên file không được cung cấp.');
        }

        const ext = path.extname(filename) || '.png';
        const indexPrefix = (typeof promptIndex === 'number' && promptIndex >= 0)
            ? `${promptIndex + 1}_`
            : '';
        
        let baseNamePart = path.basename(filename, ext)
            .substring(0, 30)
            .replace(/[^a-z0-9_]/gi, '_');

        const safeFilename = `${indexPrefix}${baseNamePart}_${Date.now()}${ext}`;

        const fullPath = path.join(savePath, safeFilename);
        const dirPath = path.dirname(fullPath);
        if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
        const data = base64Data.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(data, 'base64');
        await fs.promises.writeFile(fullPath, buffer);
        console.log(`[save-image-to-disk] Saved image to: ${fullPath}`);
        return { success: true, path: fullPath };
    } catch (error: any) {
        console.error('Lỗi khi lưu file ảnh:', error);
        return { success: false, error: error.message };
    }
});


ipcMain.on('download-image', async (event, { imageDataUrl, storyTitle }) => {
    // ... (Giữ nguyên logic)
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return;
    const defaultFilename = `thumbnail_${Date.now()}.png`;
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
        title: 'Lưu ảnh thumbnail',
        defaultPath: defaultFilename,
        filters: [{ name: 'PNG Images', extensions: ['png'] }]
    });
    if (canceled || !filePath) {
        mainWindow.webContents.send('download-complete', { success: false, error: 'Download canceled' });
        return;
    }
    try {
        const base64Data = imageDataUrl.replace(/^data:image\/(png|jpeg);base64,/, "");
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFileSync(filePath, buffer);
        mainWindow.webContents.send('download-complete', { success: true, path: filePath });
    } catch (error: any) {
        console.error('Image download error:', error);
        mainWindow.webContents.send('download-complete', { success: false, error: error.message });
    }
});

ipcMain.handle("select-download-directory", async (event) => {
  // ... (Giữ nguyên logic)
  const mainWindow = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"]
  });
  if (canceled || filePaths.length === 0) {
    return null;
  }
  return filePaths[0];
});

function stripBom(content: string): string {
    // ... (Giữ nguyên logic)
    if (content.charCodeAt(0) === 0xFEFF) {
        return content.slice(1);
    }
    return content;
}

ipcMain.handle('import-prompts-from-file', async (event) => {
    // ... (Giữ nguyên logic)
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return { success: false, error: 'Main window not found' };
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Chọn file .txt chứa prompts',
        filters: [{ name: 'Text Files', extensions: ['txt'] }],
        properties: ['openFile']
    });
    if (canceled || filePaths.length === 0) {
        return { success: false, error: 'No file selected' };
    }
    try {
        const filePath = filePaths[0];
        const content = stripBom(fs.readFileSync(filePath, 'utf-8'));
        let prompts: string[] = [];
        try {
            const jsonData = JSON.parse(content);
            let jsonArray: any[] = [];
            if (Array.isArray(jsonData)) {
                jsonArray = jsonData;
            } else if (typeof jsonData === 'object' && jsonData !== null && Array.isArray(jsonData.prompts)) {
                jsonArray = jsonData.prompts;
            } else {
                throw new Error('Nội dung JSON không phải là mảng, xử lý như text.');
            }
            prompts = jsonArray.map((item: any) => {
                if (typeof item === 'object' && item !== null) {
                    return JSON.stringify(item, null, 2);
                } else if (typeof item === 'string') {
                    return item;
                }
                return null;
            }).filter((p): p is string => p !== null && p.trim() !== '');
            if (prompts.length > 0) {
                 return { success: true, prompts };
            } else {
                 throw new Error('Mảng JSON không chứa prompt hợp lệ nào.');
            }
        } catch (jsonError: any) {
            prompts = content.split(/\r?\n/).filter(line => line.trim() !== '');
             if (prompts.length > 0) {
                return { success: true, prompts };
            } else {
                 throw new Error('Không tìm thấy nội dung hợp lệ nào trong tệp.');
            }
        }
    } catch (error: any) {
        console.error("File import error:", error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('import-prompts-from-json', async (event) => {
    // ... (Giữ nguyên logic)
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return { success: false, error: 'Main window not found' };
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Chọn file .json chứa prompts',
        filters: [{ name: 'JSON Files', extensions: ['json'] }],
        properties: ['openFile']
    });
    if (canceled || filePaths.length === 0) {
        return { success: false, error: 'No file selected' };
    }
    try {
        const filePath = filePaths[0];
        const content = stripBom(fs.readFileSync(filePath, 'utf-8'));
        const jsonData = JSON.parse(content);
        let jsonArray: any[] = [];
        if (Array.isArray(jsonData)) {
            jsonArray = jsonData;
        } else if (typeof jsonData === 'object' && jsonData !== null && Array.isArray(jsonData.prompts)) {
            jsonArray = jsonData.prompts;
        } else {
            throw new Error('Định dạng JSON không hợp lệ. Cần một mảng (array) hoặc object chứa key "prompts".');
        }
        const prompts: string[] = jsonArray.map((item: any) => {
             if (typeof item === 'object' && item !== null) {
                return JSON.stringify(item, null, 2);
            } else if (typeof item === 'string') {
                return item;
            }
            return null;
        }).filter((p): p is string => p !== null && p.trim() !== '');
        if (prompts.length === 0) {
             throw new Error('Không tìm thấy prompt hợp lệ nào trong tệp JSON.');
        }
        return { success: true, prompts };
    } catch (error: any) {
        console.error("JSON import error:", error);
        const errorMessage = error instanceof SyntaxError ? `Lỗi phân tích cú pháp JSON: ${error.message}` : `Lỗi đọc hoặc xử lý file: ${error.message}`;
        return { success: false, error: errorMessage };
    }
});

ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});


// =================================================================
// 2. LOGIC TẢI FILE
// =================================================================
const downloadFile = async (
    mainWindow: BrowserWindow,
    url: string,
    promptText: string,
    savePath: string | null,
    promptIndex: number, 
    autoSaveConfig: { enabled: boolean; path: string | null; allowOverwrite: boolean; splitFolders: boolean; videosPerFolder: number }
): Promise<{ success: boolean; path?: string; error?: string; }> => {
    // ... (Giữ nguyên logic)
    let finalPath: string | null = null;
    let finalSaveDirectory: string | null = savePath;
    if (autoSaveConfig.enabled && autoSaveConfig.path) {
        finalSaveDirectory = autoSaveConfig.path;
        finalPath = finalSaveDirectory;
    } else if (savePath) {
        finalPath = savePath;
        finalSaveDirectory = path.dirname(savePath);
    } else {
        const defaultFilename = `${promptIndex + 1}_${Date.now()}.mp4`;
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            title: "Lưu video",
            defaultPath: defaultFilename,
            filters: [{ name: "MP4 Videos", extensions: ["mp4"] }]
        });
        if (canceled || !filePath) {
            mainWindow.webContents.send("download-complete", { success: false, error: "Download canceled" });
            return { success: false, error: "Download canceled" };
        }
        finalPath = filePath;
        finalSaveDirectory = path.dirname(filePath);
    }
    if (finalPath && finalSaveDirectory) {
        try {
            if (autoSaveConfig.enabled && autoSaveConfig.splitFolders && autoSaveConfig.videosPerFolder > 0) {
                const partIndex = Math.floor(promptIndex / autoSaveConfig.videosPerFolder) + 1;
                finalSaveDirectory = path.join(finalSaveDirectory, `Phần ${partIndex}`);
            }
            if (finalSaveDirectory && !fs.existsSync(finalSaveDirectory)) {
                fs.mkdirSync(finalSaveDirectory, { recursive: true });
                console.log(`Đã tạo thư mục (hoặc đã tồn tại): ${finalSaveDirectory}`);
            }
            const stt = promptIndex + 1;
            const timestamp = Date.now();
            let finalFilename = `${stt}_${timestamp}.mp4`;
            try {
                 const promptObj = JSON.parse(promptText);
                 if (promptObj.scene) {
                    const sceneStr = String(promptObj.scene).replace(/[^a-zA-Z0-9_-]/g, '');
                    if (sceneStr.length > 0 && sceneStr.length < 20) {
                         finalFilename = `${sceneStr}_${timestamp}.mp4`;
                    }
                 }
            } catch (e) { /* Ignore */ }
            let potentialPath = path.join(finalSaveDirectory!, finalFilename);
            if (fs.existsSync(potentialPath)) {
                if (autoSaveConfig.allowOverwrite === true) {
                    const newTimestamp = `${timestamp}_${Math.floor(Math.random() * 1000)}`;
                    const ext = path.extname(finalFilename);
                    const baseName = path.basename(finalFilename, ext).split('_')[0];
                    finalFilename = `${baseName}_${newTimestamp}${ext}`;
                    finalPath = path.join(finalSaveDirectory!, finalFilename);
                    console.log(`File gốc tồn tại, không cho phép đè. Lưu thành: ${finalFilename}`);
                } else {
                    finalPath = potentialPath;
                    console.log(`File gốc tồn tại, chế độ xóa file cũ đang BẬT. Xóa file cũ: ${finalFilename}`);
                    try {
                        fs.unlinkSync(potentialPath);
                        console.log(`Đã xóa file cũ thành công: ${potentialPath}`);
                    } catch (unlinkError: any) {
                        console.error(`Không thể xóa file cũ ${potentialPath}: ${unlinkError.message}`);
                    }
                }
            } else {
                finalPath = potentialPath;
            }
        } catch (dirError: any) {
            const result = { success: false, error: "Lỗi khi xử lý thư mục hoặc tên tệp lưu." };
            console.error("Directory/Filename handling error:", dirError);
            mainWindow.webContents.send("download-complete", result);
            return result;
        }
    } else {
        const result = { success: false, error: "Không thể xác định đường dẫn lưu file." };
        console.error("Save path determination error.");
        mainWindow.webContents.send("download-complete", result);
        return result;
    }
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        fs.writeFileSync(finalPath!, buffer);
        const result = { success: true, path: finalPath };
        mainWindow.webContents.send("download-complete", result);
        return result;
    } catch (error: any) {
        console.error("Download error:", error);
        const result = { success: false, error: error.message };
        mainWindow.webContents.send("download-complete", result);
        return result;
    }
};

ipcMain.on("download-video", async (event, { url, promptText, savePath, promptIndex }) => {
    // ... (Giữ nguyên logic)
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return;
    const manualDownloadConfig = {
        enabled: !!savePath,
        path: savePath,
        allowOverwrite: false,
        splitFolders: false,
        videosPerFolder: 10
    };
    await downloadFile(mainWindow, url, promptText, savePath, promptIndex, manualDownloadConfig);
});


// =================================================================
// 3. LOGIC TỰ ĐỘNG HÓA (AutoBrowser)
// =================================================================
ipcMain.on("browser:start-automation", async (event, { prompts, authToken, model, aspectRatio, autoSaveConfig, currentUser, concurrentStreams }) => {
    // ... (Giữ nguyên toàn bộ logic của "browser:start-automation")
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return;

    if (!currentUser || !currentUser.subscription || new Date(currentUser.subscription.end_date) < new Date()) {
        const message = !currentUser?.subscription ? "Bạn cần nâng cấp gói." : "Gói đăng ký đã hết hạn.";
        dialog.showMessageBox(mainWindow, { type: 'warning', title: 'Yêu Cầu Nâng Cấp', message });
        mainWindow.webContents.send("navigate-to-view", "packages");
        return;
    }

    stopAutomationFlag = false;
    const PROMPTS_PER_PROJECT = 4;
    const MAX_COOKIE_RETRIES = 5;
    const MAX_SETUP_RETRIES = 3;

    const modelFallbackList = [
        model, 'veo_3_1_t2v_fast_ultra', 'veo_3_1_t2v', 'veo_3_0_t2v_fast_ultra',
        'veo_3_0_t2v_fast', 'veo_3_0_t2v', 'veo_2_1_fast_d_15_t2v'
    ].filter((v, i, a) => a.indexOf(v) === i);

    const sendLog = (promptId: string | null, message: string, status: string, videoUrl = null, operationName = null, sceneId = null, mediaId = null, projectId = null, cookie = null) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("browser:log", { promptId, message, status, videoUrl, operationName, sceneId, mediaId, projectId, cookie });
        }
        console.log(`[${promptId || "general"}] ${message}`);
    };

    const attemptSinglePrompt = async (prompt: any, projectId: string, currentCookie: any): Promise<boolean> => {
        let promptTextForApi: string;
        try {
            if (!prompt.text || typeof prompt.text !== 'string' || prompt.text.trim() === '') {
                 throw new Error("Nội dung Prompt không được để trống.");
            }
            const promptObj = JSON.parse(prompt.text);
            promptTextForApi = promptObj.prompt || promptObj.text;
             if (!promptTextForApi || typeof promptTextForApi !== 'string' || promptTextForApi.trim() === '') {
                throw new Error("Không tìm thấy trường 'prompt'/'text' hợp lệ trong JSON hoặc giá trị rỗng.");
            }
             promptTextForApi = promptTextForApi.trim();
        } catch (e) {
             if (!prompt.text || typeof prompt.text !== 'string' || prompt.text.trim() === '') {
                 return false;
             }
            promptTextForApi = prompt.text.trim();
        }

        for (const modelKey of modelFallbackList) {
            if (stopAutomationFlag) return false;
            try {
                sendLog(prompt.id, `Đang tạo video...`, "submitting");

                const clientGeneratedSceneId = `client-generated-uuid-${Date.now()}-${Math.random()}`;
                const requestBody = {
                    "clientContext": { "projectId": projectId, "tool": "PINHOLE" },
                    "requests": [{
                        "aspectRatio": `VIDEO_ASPECT_RATIO_${aspectRatio.toUpperCase()}`,
                        "seed": Math.floor(Math.random() * 100000),
                        "textInput": { "prompt": promptTextForApi },
                        "videoModelKey": aspectRatio === 'PORTRAIT' ? 'veo_3_1_t2v_portrait' : modelKey,
                        "metadata": { "sceneId": clientGeneratedSceneId }
                    }]
                };

                const generateResponse = await handleApiRequest(null, {
                    url: "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText",
                    cookie: currentCookie,
                    options: { method: "POST", body: requestBody }
                });

                const operation = generateResponse?.operations?.[0];
                if (!operation?.operation?.name || !operation?.sceneId) throw new Error("Không lấy được operation/scene ID.");

                sendLog(prompt.id, `Video đang được xử lý..`, "processing", null, operation.operation.name, operation.sceneId, null, projectId, currentCookie);

                while (!stopAutomationFlag) {
                    await new Promise(resolve => setTimeout(resolve, STATUS_CHECK_INTERVAL));
                    if(stopAutomationFlag) break;

                    sendLog(prompt.id, "Video đang được tạo...", "processing");

                    const statusResponse = await handleApiRequest(null, {
                        url: "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus",
                        cookie: currentCookie,
                        options: { method: "POST", body: { operations: [[{ operation: { name: operation.operation.name }, sceneId: operation.sceneId }]] } }
                    });

                    if (!statusResponse || !Array.isArray(statusResponse.operations) || statusResponse.operations.length === 0) {
                        console.error(`[${prompt.id}] Invalid status response structure:`, statusResponse);
                        throw new Error("Cấu trúc phản hồi trạng thái không hợp lệ.");
                    }

                    const opResult = statusResponse.operations[0];
                    const apiStatus = (opResult?.status || 'UNKNOWN_STATUS').replace("MEDIA_GENERATION_STATUS_", "").toLowerCase();
                    sendLog(prompt.id, `Trạng thái: ${apiStatus}`, "processing");

                    if (opResult?.status === "MEDIA_GENERATION_STATUS_SUCCESSFUL") {
                        const videoMetadata = opResult?.operation?.metadata?.video;
                        if (!videoMetadata || (!videoMetadata.fifeUrl && !videoMetadata.servingBaseUri)) {
                            console.error(`[${prompt.id}] Success status but no video URL found:`, opResult);
                            throw new Error("Tạo thành công nhưng không tìm thấy URL video.");
                        }
                        const videoUrl = videoMetadata.fifeUrl || videoMetadata.servingBaseUri;
                        const mediaId = videoMetadata.mediaGenerationId;

                        sendLog(prompt.id, "Thành công!", "success", videoUrl, operation.operation.name, operation.sceneId, mediaId, projectId, currentCookie);

                        if (autoSaveConfig.enabled && autoSaveConfig.path && videoUrl) {
                            await downloadFile(mainWindow, videoUrl, prompt.text, autoSaveConfig.path, prompt.originalIndex, autoSaveConfig);
                        }
                        return true;
                    } else if (opResult?.status === "MEDIA_GENERATION_STATUS_FAILED") {
                        const errorMessage = opResult?.error?.message || "Lỗi không xác định từ Veo.";
                        console.error(`[${prompt.id}] API Failure Details:`, opResult?.error);
                        throw new Error(errorMessage);
                    } else if (opResult?.status === "MEDIA_GENERATION_STATUS_UNSPECIFIED" || !opResult?.status) {
                        console.warn(`[${prompt.id}] Trạng thái không xác định từ API:`, opResult);
                    }
                }
                if (stopAutomationFlag) return false;
            } catch (processingError: any) {
                sendLog(prompt.id, `Lvmdht,tmdm...`, 'running');
                await new Promise(resolve => setTimeout(resolve, 3000));
            }
        }
        sendLog(prompt.id, `Không thể tạo video , Kiểm tra Prompt hoặc CHạy lại lỗi.`, "error");
        return false;
    };

    class ProjectProcessor {
        // ... (Giữ nguyên logic)
        promptsToProcess: any[];
        authToken: string;
        onHalfComplete: () => void;
        onAllPromptsSettled: () => void;
        constructor(prompts: any[], authToken: string, onHalfComplete: () => void, onAllPromptsSettled: () => void) {
            this.promptsToProcess = prompts;
            this.authToken = authToken;
            this.onHalfComplete = onHalfComplete;
            this.onAllPromptsSettled = onAllPromptsSettled;
        }
        async processPromptWithRetries(prompt: any, initialProjectId: string, initialCookie: any): Promise<boolean> {
            if (!prompt.text || typeof prompt.text !== 'string' || prompt.text.trim() === '') {
                 sendLog(prompt.id, `Nội dung Prompt không được để trống. Bỏ qua prompt này.`, "error");
                 return false;
            }
            let currentCookie = initialCookie;
            let currentProjectId = initialProjectId;
            for (let cookieAttempt = 0; cookieAttempt < MAX_COOKIE_RETRIES; cookieAttempt++) {
                if (stopAutomationFlag) return false;
                if (cookieAttempt > 0) {
                    try {
                        sendLog(prompt.id, `Dtlvckprjm...`, 'running');
                        const cookieResponse = await fetch('https://mmoreal.com/api/prf.php', { headers: { 'Authorization': `Bearer ${this.authToken}` } });
                        const cookieData = await cookieResponse.json();
                        if (!cookieData.success) throw new Error("Không thể lấy cookie mới.");
                        currentCookie = cookieData.cookie;
                        const createProjectResponse = await handleApiRequest(null, {
                            url: 'https://labs.google/fx/api/trpc/project.createProject',
                            cookie: currentCookie,
                            options: { method: 'POST', body: { json: { projectTitle: `Veo Batch (Retry ${cookieAttempt}) - ${Date.now()}`, toolName: "PINHOLE" } } }
                        });
                        currentProjectId = createProjectResponse?.result?.data?.json?.result?.projectId;
                        if (!currentProjectId) throw new Error("Không thể tạo project mới.");
                        sendLog(prompt.id, `Dcprjidm: ${currentProjectId}`, 'running');
                    } catch (e: any) {
                        sendLog(prompt.id, `Dtlvckm: ${e.message}`, 'error');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        continue;
                    }
                }
                const success = await attemptSinglePrompt(prompt, currentProjectId, currentCookie);
                if (success) return true;
                sendLog(prompt.id, `Dtlvckm...`, 'running');
            }
            sendLog(prompt.id, `Tạo video thất bại. Prompt có thể vi phạm chính sách, hãy kiểm tra prompt hoặc Chạy lại lỗi.`, "error");
            return false;
        }
        async run() {
            let initialCookie: any = null;
            let initialProjectId: string | null = null;
            let setupSuccess = false;
            for (let setupAttempt = 0; setupAttempt < MAX_SETUP_RETRIES; setupAttempt++) {
                if (stopAutomationFlag) break;
                try {
                    sendLog(null, `Ktl...`, "running");
                    const cookieResponse = await fetch('https://mmoreal.com/api/prf.php', { headers: { 'Authorization': `Bearer ${this.authToken}` } });
                    const cookieData = await cookieResponse.json();
                    if (!cookieData.success) throw new Error("Không thể lấy cookie.");
                    initialCookie = cookieData.cookie;
                    const createProjectResponse = await handleApiRequest(null, {
                        url: 'https://labs.google/fx/api/trpc/project.createProject',
                        cookie: initialCookie,
                        options: { method: 'POST', body: { json: { projectTitle: `Veo Batch - ${Date.now()}`, toolName: "PINHOLE" } } }
                    });
                    initialProjectId = createProjectResponse?.result?.data?.json?.result?.projectId;
                    if (!initialProjectId) throw new Error("Không thể tạo project.");
                    sendLog(null, `Ktltc: ${initialProjectId}.`, "running");
                    setupSuccess = true;
                    break;
                } catch (setupError: any) {
                    sendLog(null, `Lỗi khởi tạo lô, vui lòng Đăng nhập lại: ${setupError.message}`, "error");
                    if (setupAttempt < MAX_SETUP_RETRIES - 1) {
                        await new Promise(resolve => setTimeout(resolve, 5000));
                    }
                }
            }
            if (!setupSuccess) {
                sendLog(null, `Lỗi khởi tạo lô, vui lòng Đăng nhập lại.`, "error");
                this.promptsToProcess.forEach(p => sendLog(p.id, "Lỗi khởi tạo lô, vui lòng Đăng nhập lại.", "error"));
                this.onHalfComplete();
                this.onAllPromptsSettled();
                return;
            }
            let completedOrFailedCount = 0;
            let halfCompleteCalled = false;
            const triggerPoint = Math.min(2, this.promptsToProcess.length);
            const tasks = this.promptsToProcess.map(prompt =>
                this.processPromptWithRetries(prompt, initialProjectId!, initialCookie)
                    .finally(() => {
                        if (stopAutomationFlag) return;
                        completedOrFailedCount++;
                        if (completedOrFailedCount === triggerPoint && !halfCompleteCalled) {
                            halfCompleteCalled = true;
                            sendLog(null, `Đã xử lý ...`, "running");
                            this.onHalfComplete();
                        }
                    })
            );
            await Promise.all(tasks);
            this.onAllPromptsSettled();
        }
    }

    const runQueueManager = async () => {
        // ... (Giữ nguyên logic)
        const mainPromptQueue = [...prompts];
        const totalPromptsToProcess = mainPromptQueue.length;
        let totalPromptsSettled = 0;
        const maxParallelProjects = Math.ceil(concurrentStreams / PROMPTS_PER_PROJECT);
        let activeProjects = 0;
        sendLog(null, `Bắt đầu xử lý.`, "running");
        const launchNextBatch = () => {
            if (stopAutomationFlag || activeProjects >= maxParallelProjects || mainPromptQueue.length === 0) {
                if (activeProjects === 0 && mainPromptQueue.length === 0 && totalPromptsSettled === totalPromptsToProcess) {
                    // ...
                }
                return;
            }
            activeProjects++;
            const batch = mainPromptQueue.splice(0, PROMPTS_PER_PROJECT);
            sendLog(null, `Ktlm.`, "running");
            const onHalfComplete = () => {
                activeProjects--;
                sendLog(null, `Đang tạo video.`, "running");
                launchNextBatch();
            };
            const onAllPromptsSettled = () => {
                totalPromptsSettled += batch.length;
                sendLog(null, `Hoàn thành.`, "running");
                if (totalPromptsToProcess === totalPromptsSettled) {
                     if (!stopAutomationFlag) {
                        sendLog(null, "===== Đã xử lý tất cả prompt! =====", "finished");
                    }
                }
                if (batch.length < 2 && activeProjects === 0) {
                    launchNextBatch();
                }
            };
            const processor = new ProjectProcessor(batch, authToken, onHalfComplete, onAllPromptsSettled);
            processor.run();
        };
        for (let i = 0; i < maxParallelProjects; i++) {
            launchNextBatch();
        }
        if (totalPromptsToProcess === 0) {
            sendLog(null, "Không có prompt nào để xử lý.", "finished");
        }
    };
    runQueueManager();
});


// =================================================================
// 4. LOGIC GHÉP VIDEO (Đã có)
// =================================================================
ipcMain.handle('select-video-files', async (event) => {
    // ... (Giữ nguyên logic)
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return null;
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
        title: 'Chọn các file video', properties: ['openFile', 'multiSelections'],
        filters: [ { name: 'Videos', extensions: ['mp4'] } ]
    });
    if (canceled || filePaths.length === 0) { return null; }
    return filePaths.map(p => p.replace(/\\/g, '/'));
});

ipcMain.handle('merge-videos', async (event, { videoPaths, savePath }) => {
    // ... (Giữ nguyên logic)
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return { success: false, error: 'Main window not found' };
    let outputPath = '';
    if (savePath) {
        outputPath = path.join(savePath, `merged-video-${Date.now()}.mp4`);
    } else {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            title: 'Lưu video đã ghép', defaultPath: `merged-video-${Date.now()}.mp4`,
            filters: [{ name: 'MP4 Videos', extensions: ['mp4'] }]
        });
        if (canceled || !filePath) { return { success: false, error: 'Hủy lưu file' }; }
        outputPath = filePath;
    }
    return new Promise((resolve) => {
        ffmpegCommand = ffmpeg();
        const fileListPath = path.join(app.getPath('temp'), `filelist-${Date.now()}.txt`);
        const fileContent = videoPaths.map((p: string) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
        fs.writeFileSync(fileListPath, fileContent);
        ffmpegCommand.input(fileListPath).inputOptions(['-f', 'concat', '-safe', '0']).outputOptions('-c', 'copy')
            .on('progress', (progress) => {
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('merge-progress', progress);
                }
            })
            .on('error', (err, stdout, stderr) => {
                console.error('FFmpeg error:', err.message); console.error('FFmpeg stderr:', stderr);
                const userCancelled = err.message.includes('SIGKILL');
                ffmpegCommand = null;
                try { fs.unlinkSync(fileListPath); } catch (e) { /* ignore */ }
                resolve({ success: false, error: userCancelled ? 'Hủy ghép' : `Lỗi FFmpeg: ${err.message}.` });
            })
            .on('end', () => {
                console.log('FFmpeg finished successfully.');
                ffmpegCommand = null;
                try { fs.unlinkSync(fileListPath); } catch (e) { /* ignore */ }
                resolve({ success: true, path: outputPath });
            })
            .save(outputPath);
    });
});

ipcMain.handle('stop-merge', async () => {
    // ... (Giữ nguyên logic)
    if (ffmpegCommand) {
        try {
            ffmpegCommand.kill('SIGKILL'); ffmpegCommand = null;
            console.log('FFmpeg process stopped by user.');
            return { success: true };
        } catch(e) {
            console.error('Error stopping ffmpeg:', e);
            return { success: false, error: 'Failed to stop process.' };
        }
    }
    return { success: false, error: 'Không có quá trình ghép nào đang chạy.' };
});


// =================================================================
// 5. CÁC HÀM TRỢ GIÚP TẠO VIDEO (I2V & T2V TUẦN TỰ)
// *** DI CHUYỂN TOÀN BỘ KHỐI NÀY LÊN TRÊN ***
// =================================================================

// --- Helper: Tải ảnh lên (Dùng chung cho I2V và Video Mở rộng) ---
const uploadImage = async (
    mainWindow: BrowserWindow,
    rawImageBytes: string,
    cookie: any,
    promptId: string | null,
    sessionId: string,
    logChannel: 'browser:log' | 'extended-video:log' = 'browser:log'
): Promise<string> => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(logChannel, { promptId, message: 'Đang tải ảnh lên...', status: 'submitting' });
    }
    if (!rawImageBytes || typeof rawImageBytes !== 'string' || rawImageBytes.length < 100) {
        throw new Error('Dữ liệu ảnh (base64) không hợp lệ hoặc bị trống.');
    }
    const uploadResponse = await handleApiRequest(null, {
        url: 'https://aisandbox-pa.googleapis.com/v1:uploadUserImage',
        cookie,
        options: {
            method: 'POST',
            body: {
                "imageInput": { "rawImageBytes": rawImageBytes, "isUserUploaded": true, "mimeType": "image/jpeg" },
                "clientContext": { "sessionId": sessionId, "tool": "ASSET_MANAGER" }
            }
        }
    });
    const mediaId = uploadResponse?.mediaGenerationId?.mediaGenerationId;
    if (!mediaId) {
        console.error(`[${promptId || 'general'}] Failed to get mediaId from upload response:`, uploadResponse);
        throw new Error('Không thể lấy mediaId sau khi tải ảnh lên.');
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
         mainWindow.webContents.send(logChannel, { promptId, message: `Tải ảnh lên thành công...`, status: 'submitting' });
    }
    return mediaId;
};

// --- Helper: Xử lý I2V (Cho tab "Tạo Video Đồng Nhất") ---
const processSingleFramePromptInBatch = async (
    mainWindow: BrowserWindow,
    prompt: any,
    projectId: string,
    cookie: any,
    aspectRatio: 'LANDSCAPE' | 'PORTRAIT',
    autoSaveConfig: any
) => {

    const sendLog = (promptId: string | null, message: string, status: string, videoUrl: string | null = null, operationName: string | null = null, sceneId: string | null = null, mediaId: string | null = null, projectId: string | null = null, cookie: any = null) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("browser:log", { promptId, message, status, videoUrl, operationName, sceneId, mediaId, projectId, cookie });
        }
        console.log(`[${promptId || "general"}] ${message}`);
    };

    let startMediaId: string | null = null;
    let endMediaId: string | null = null;

    try {
        if (!prompt.startImageBase64) throw new Error("Cần có ảnh Bắt đầu.");
        if (!prompt.text || typeof prompt.text !== 'string' || prompt.text.trim() === '') throw new Error("Nội dung Prompt không được để trống.");

        const sessionId = `;${Date.now()}`;
        startMediaId = await uploadImage(mainWindow, prompt.startImageBase64, cookie, prompt.id, sessionId + "-start", 'browser:log');
        if (prompt.endImageBase64) {
            endMediaId = await uploadImage(mainWindow, prompt.endImageBase64, cookie, prompt.id, sessionId + "-end", 'browser:log');
        }

        sendLog(prompt.id, `Bắt đầu tạo video...`, "submitting");
        const clientGeneratedSceneId = `client-generated-uuid-${Date.now()}-${Math.random()}`;

        let url: string;
        let videoModelKey: string;
        let requestDetails: any;
        let clientContext: any = { "projectId": projectId, "tool": "PINHOLE", "userPaygateTier": "PAYGATE_TIER_TWO" };

        if (endMediaId) { 
            url = 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartAndEndImage';
            videoModelKey = aspectRatio === 'PORTRAIT' ? 'veo_3_1_i2v_s_portrait_fl' : 'veo_3_1_i2v_s_fl';
            requestDetails = {
                "startImage": { "mediaId": startMediaId },
                "endImage": { "mediaId": endMediaId },
                 "aspectRatio": `VIDEO_ASPECT_RATIO_${aspectRatio.toUpperCase()}`,
                 "seed": Math.floor(Math.random() * 100000),
                 "textInput": { "prompt": prompt.text.trim() },
                 "metadata": { "sceneId": clientGeneratedSceneId },
                 "videoModelKey": videoModelKey
            };
        } else {
            url = 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage';
            videoModelKey = aspectRatio === 'PORTRAIT' ? 'veo_3_1_i2v_s_portrait' : 'veo_3_1_i2v_s';
             requestDetails = {
                "startImage": { "mediaId": startMediaId },
                 "aspectRatio": `VIDEO_ASPECT_RATIO_${aspectRatio.toUpperCase()}`,
                 "seed": Math.floor(Math.random() * 100000),
                 "textInput": { "prompt": prompt.text.trim() },
                 "metadata": { "sceneId": clientGeneratedSceneId },
                 "videoModelKey": videoModelKey
            };
        }

        const requestBody = { "clientContext": clientContext, "requests": [requestDetails] };
        const generateResponse = await handleApiRequest(null, { url, cookie, options: { method: 'POST', body: requestBody } });
        const operation = generateResponse?.operations?.[0];
        if (!operation?.operation?.name || !operation?.sceneId) {
             console.error(`[${prompt.id}] Invalid generate response:`, generateResponse);
            throw new Error("Không lấy được operation/scene ID từ API tạo video.");
        }

        sendLog(prompt.id, `Đang tạo video...`, "processing", null, operation.operation.name, operation.sceneId, null, projectId, cookie);

        while (!stopAutomationFlag) {
            await new Promise(resolve => setTimeout(resolve, STATUS_CHECK_INTERVAL));
             if(stopAutomationFlag) break;

            sendLog(prompt.id, "Đang kiểm tra trạng thái video...", "processing");
            const statusResponse = await handleApiRequest(null, {
                url: "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus",
                cookie,
                options: { method: "POST", body: { operations: [[{ operation: { name: operation.operation.name }, sceneId: operation.sceneId }]] } }
            });

            if (!statusResponse || !Array.isArray(statusResponse.operations) || statusResponse.operations.length === 0) {
                 console.error(`[${prompt.id}] Invalid status response structure:`, statusResponse);
                 throw new Error("Cấu trúc phản hồi trạng thái không hợp lệ.");
            }
            const operationResult = statusResponse.operations[0];
            const apiStatus = (operationResult?.status || 'UNKNOWN_STATUS').replace("MEDIA_GENERATION_STATUS_", "").toLowerCase();
            sendLog(prompt.id, `Trạng thái: ${apiStatus}`, "processing");

            if (operationResult?.status === "MEDIA_GENERATION_STATUS_SUCCESSFUL") {
                const videoMetadata = operationResult?.operation?.metadata?.video;
                if (!videoMetadata || (!videoMetadata.fifeUrl && !videoMetadata.servingBaseUri)) {
                    console.error(`[${prompt.id}] Success status but no video URL found:`, operationResult);
                    throw new Error("Tạo thành công nhưng không tìm thấy URL video.");
                }
                const videoUrl = videoMetadata.fifeUrl || videoMetadata.servingBaseUri;
                const mediaId = videoMetadata.mediaGenerationId;

                sendLog(prompt.id, "Hoàn thành!", "success", videoUrl, operation.operation.name, operation.sceneId, mediaId, projectId, cookie);

                if (autoSaveConfig.enabled && autoSaveConfig.path && videoUrl) {
                    const dlResult = await downloadFile(mainWindow, videoUrl, prompt.text, autoSaveConfig.path, prompt.originalIndex, autoSaveConfig);
                    sendLog(prompt.id, dlResult.success ? 'Đã lưu!' : `Lỗi lưu: ${dlResult.error}`, dlResult.success ? 'success' : 'error', videoUrl);
                }
                return;
            } else if (operationResult?.status === "MEDIA_GENERATION_STATUS_FAILED") {
                 const errorMessage = operationResult?.error?.message || "Lỗi không xác định từ Veo khi tạo video.";
                 console.error(`[${prompt.id}] API Video Creation Failure Details:`, operationResult?.error);
                 throw new Error(errorMessage);
            } else if (operationResult?.status === "MEDIA_GENERATION_STATUS_UNSPECIFIED" || !operationResult?.status) {
                 console.warn(`[${prompt.id}] Trạng thái video không xác định từ API:`, operationResult);
            }
        }
        if (stopAutomationFlag) { sendLog(prompt.id, `Đã dừng bởi người dùng`, 'idle'); }

    } catch (error: any) {
        let errorMessage = error.message;
        if (errorMessage === "Nội dung Prompt không được để trống." || errorMessage === "Cần có ảnh Bắt đầu.") {
             sendLog(prompt.id, `Lỗi: ${errorMessage}`, 'error');
        } else if (error.message.includes('mediaId')) {
             sendLog(prompt.id, `Lỗi tải ảnh lên: ${errorMessage}`, 'error');
        } else if (error.statusCode === 500) {
            errorMessage = `Lỗi máy chủ (${error.message}). Thử lại...`
            sendLog(prompt.id, `Lỗi: ${errorMessage}`, 'error');
        } else {
             sendLog(prompt.id, `Lỗi: ${errorMessage}`, 'error');
        }
        if (errorMessage !== "Nội dung Prompt không được để trống." && errorMessage !== "Cần có ảnh Bắt đầu.") {
             throw error;
        }
    }
};

// --- Helper: Tải video về đường dẫn tạm (Cho Video Mở Rộng) ---
const downloadVideoToPath = async (url: string, filePath: string): Promise<string> => {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch video: ${response.statusText}`);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await fs.promises.writeFile(filePath, buffer);
        return filePath;
    } catch (error: any) {
        console.error(`Download to path error (${filePath}):`, error);
        throw new Error(`Lỗi tải file tạm: ${error.message}`);
    }
};

// --- Helper: Trích xuất frame cuối (Cho Video Mở Rộng) ---
const extractLastFrame = (videoPath: string, outputPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
            .inputOptions('-sseof', '-0.1') 
            .outputOptions('-vframes', '1') 
            .save(outputPath)
            .on('end', () => {
                console.log(`Đã trích xuất frame cuối: ${outputPath}`);
                resolve(outputPath);
            })
            .on('error', (err) => {
                console.error('FFmpeg Lỗi trích xuất frame:', err);
                reject(new Error(`FFmpeg Lỗi trích xuất frame: ${err.message}`));
            });
    });
};

// --- Helper: Chuyển ảnh sang Base64 (Cho Video Mở Rộng) ---
const convertImageToBase64 = async (imagePath: string): Promise<string> => {
    try {
        const buffer = await fs.promises.readFile(imagePath);
        return buffer.toString('base64');
    } catch (error: any) {
         console.error('Lỗi chuyển ảnh sang base64:', error);
         throw new Error(`Lỗi đọc file frame: ${error.message}`);
    }
};

// --- Helper: Ghép video (nội bộ) (Cho Video Mở Rộng) ---
const mergeVideosInternal = (videoPaths: string[], outputPath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const fileListPath = path.join(app.getPath('temp'), `extended-filelist-${Date.now()}.txt`);
        const fileContent = videoPaths.map((p: string) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
        fs.writeFileSync(fileListPath, fileContent);
        console.log(`Đang ghép ${videoPaths.length} video vào ${outputPath}`);
        ffmpeg()
            .input(fileListPath)
            .inputOptions(['-f', 'concat', '-safe', '0'])
            .outputOptions('-c', 'copy')
            .save(outputPath)
            .on('end', () => {
                try { fs.unlinkSync(fileListPath); } catch (e) { /* ignore */ }
                console.log('Ghép video thành công.');
                resolve(outputPath);
            })
            .on('error', (err) => {
                try { fs.unlinkSync(fileListPath); } catch (e) { /* ignore */ }
                console.error('Lỗi ghép video :', err);
                reject(new Error(` Lỗi ghép video: ${err.message}`));
            });
    });
};

// --- Helper: Chạy Text-to-Video (T2V) Tuần tự (Cho Video Mở Rộng) ---
const runT2V_Sequential = async (
    prompt: any, projectId: string, cookie: any, model: string, aspectRatio: string,
    sendLog: (promptId: string | null, message: string, status: string, videoUrl?: string | null) => void // Sử dụng kiểu của sendExtendedLog
): Promise<{ videoUrl: string; mediaId: string; }> => {
    
    let promptTextForApi: string;
    try {
        if (!prompt.text || typeof prompt.text !== 'string' || prompt.text.trim() === '') {
             throw new Error("Nội dung Prompt không được để trống.");
        }
        try {
            const promptObj = JSON.parse(prompt.text);
            promptTextForApi = promptObj.prompt || promptObj.text;
             if (!promptTextForApi || typeof promptTextForApi !== 'string' || promptTextForApi.trim() === '') {
                throw new Error("Không tìm thấy trường 'prompt'/'text' hợp lệ trong JSON.");
            }
             promptTextForApi = promptTextForApi.trim();
        } catch (e) {
            promptTextForApi = prompt.text.trim();
        }
    } catch (e: any) {
        sendLog(prompt.id, `Lỗi: ${e.message}`, 'error');
        throw e;
    }

    const modelKey = model;
    if (stopExtendedVideoFlag) throw new Error("Đã dừng");

    try {
        sendLog(prompt.id, `Đang tạo ...`, "submitting");
        const clientGeneratedSceneId = `client-generated-uuid-${Date.now()}-${Math.random()}`;
        const requestBody = {
            "clientContext": { "projectId": projectId, "tool": "PINHOLE" },
            "requests": [{
                "aspectRatio": `VIDEO_ASPECT_RATIO_${aspectRatio.toUpperCase()}`,
                "seed": Math.floor(Math.random() * 100000),
                "textInput": { "prompt": promptTextForApi },
                "videoModelKey": aspectRatio === 'PORTRAIT' ? 'veo_3_1_t2v_portrait' : modelKey,
                "metadata": { "sceneId": clientGeneratedSceneId }
            }]
        };
        const generateResponse = await handleApiRequest(null, {
            url: "https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoText",
            cookie: cookie,
            options: { method: "POST", body: requestBody }
        });
        const operation = generateResponse?.operations?.[0];
        if (!operation?.operation?.name || !operation?.sceneId) throw new Error("Không lấy được operation/scene ID (T2V).");
        sendLog(prompt.id, `Video đang được xử lý..`, "processing");
        while (!stopExtendedVideoFlag) {
            await new Promise(resolve => setTimeout(resolve, STATUS_CHECK_INTERVAL));
            if(stopExtendedVideoFlag) break;
            sendLog(prompt.id, "Đang kiểm tra ...", "processing");
            const statusResponse = await handleApiRequest(null, {
                url: "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus",
                cookie: cookie,
                options: { method: "POST", body: { operations: [[{ operation: { name: operation.operation.name }, sceneId: operation.sceneId }]] } }
            });
            const opResult = statusResponse?.operations?.[0];
            if (!opResult) throw new Error("Cấu trúc phản hồi trạng thái T2V không hợp lệ.");
            const apiStatus = (opResult?.status || 'UNKNOWN_STATUS').replace("MEDIA_GENERATION_STATUS_", "").toLowerCase();
            if (opResult?.status === "MEDIA_GENERATION_STATUS_SUCCESSFUL") {
                const videoMetadata = opResult?.operation?.metadata?.video;
                const videoUrl = videoMetadata?.fifeUrl || videoMetadata?.servingBaseUri;
                const mediaId = videoMetadata?.mediaGenerationId;
                if (!videoUrl || !mediaId) {
                    throw new Error("Tạo T2V thành công nhưng không tìm thấy URL/MediaId.");
                }
                sendLog(prompt.id, `T2V Thành công!`, "processing");
                return { videoUrl, mediaId };
            } else if (opResult?.status === "MEDIA_GENERATION_STATUS_FAILED") {
                const errorMessage = opResult?.error?.message || "Lỗi T2V không xác định từ Veo.";
                throw new Error(errorMessage);
            } else {
                 sendLog(prompt.id, `Trạng thái : ${apiStatus}`, "processing");
            }
        }
        if (stopExtendedVideoFlag) throw new Error("Đã dừng");
    } catch (processingError: any) {
        sendLog(prompt.id, `Không tạo được: ${processingError.message}`, 'error');
        throw processingError;
    }
    throw new Error("Lỗi T2V không xác định.");
};

// --- Helper: Chạy Image-to-Video (I2V) Tuần tự (Cho Video Mở Rộng) ---
const runI2V_Sequential = async (
    prompt: any, projectId: string, cookie: any, startImageBase64: string, aspectRatio: string,
    sendLog: (promptId: string | null, message: string, status: string, videoUrl?: string | null) => void // Sử dụng kiểu của sendExtendedLog
): Promise<{ videoUrl: string; mediaId: string; }> => {
    
    let promptTextForApi: string;
    try {
        if (!prompt.text || typeof prompt.text !== 'string' || prompt.text.trim() === '') {
             throw new Error("Nội dung Prompt không được để trống.");
        }
        if (!startImageBase64) {
            throw new Error("Không có ảnh đầu vào cho Video.");
        }
        try {
            const promptObj = JSON.parse(prompt.text);
            promptTextForApi = promptObj.prompt || promptObj.text;
             if (!promptTextForApi || typeof promptTextForApi !== 'string' || promptTextForApi.trim() === '') {
                throw new Error("Không tìm thấy trường 'prompt'/'text' hợp lệ trong JSON.");
            }
             promptTextForApi = promptTextForApi.trim();
        } catch (e) {
            promptTextForApi = prompt.text.trim();
        }
    } catch (e: any) {
        sendLog(prompt.id, `Lỗi: ${e.message}`, 'error');
        throw e;
    }
    if (stopExtendedVideoFlag) throw new Error("Đã dừng");
    try {
        sendLog(prompt.id, `Đang tải ảnh...`, "submitting");
        const sessionId = `;${Date.now()}`;
        const startMediaId = await uploadImage(mainWindow!, startImageBase64, cookie, prompt.id, sessionId + "-start", 'extended-video:log');
        sendLog(prompt.id, `Đang tạo Video...`, "submitting");
        const clientGeneratedSceneId = `client-generated-uuid-${Date.now()}-${Math.random()}`;
        const url = 'https://aisandbox-pa.googleapis.com/v1/video:batchAsyncGenerateVideoStartImage';
        const videoModelKey = aspectRatio === 'PORTRAIT' ? 'veo_3_1_i2v_s_portrait' : 'veo_3_1_i2v_s';
        const requestDetails = {
            "startImage": { "mediaId": startMediaId },
            "aspectRatio": `VIDEO_ASPECT_RATIO_${aspectRatio.toUpperCase()}`,
            "seed": Math.floor(Math.random() * 100000),
            "textInput": { "prompt": promptTextForApi },
            "metadata": { "sceneId": clientGeneratedSceneId },
            "videoModelKey": videoModelKey
        };
        const clientContext: any = { "projectId": projectId, "tool": "PINHOLE", "userPaygateTier": "PAYGATE_TIER_TWO" };
        const requestBody = { "clientContext": clientContext, "requests": [requestDetails] };
        const generateResponse = await handleApiRequest(null, { url, cookie, options: { method: 'POST', body: requestBody } });
        const operation = generateResponse?.operations?.[0];
        if (!operation?.operation?.name || !operation?.sceneId) {
            throw new Error("Không lấy được operation/scene ID (I2V).");
        }
        sendLog(prompt.id, `Video đang được xử lý..`, "processing");
        while (!stopExtendedVideoFlag) {
            await new Promise(resolve => setTimeout(resolve, STATUS_CHECK_INTERVAL));
            if(stopExtendedVideoFlag) break;
            sendLog(prompt.id, "Đang kiểm tra Video...", "processing");
            const statusResponse = await handleApiRequest(null, {
                url: "https://aisandbox-pa.googleapis.com/v1/video:batchCheckAsyncVideoGenerationStatus",
                cookie,
                options: { method: "POST", body: { operations: [[{ operation: { name: operation.operation.name }, sceneId: operation.sceneId }]] } }
            });
            const opResult = statusResponse?.operations?.[0];
            if (!opResult) throw new Error("Cấu trúc phản hồi trạng thái I2V không hợp lệ.");
            const apiStatus = (opResult?.status || 'UNKNOWN_STATUS').replace("MEDIA_GENERATION_STATUS_", "").toLowerCase();
            if (opResult?.status === "MEDIA_GENERATION_STATUS_SUCCESSFUL") {
                const videoMetadata = opResult?.operation?.metadata?.video;
                const videoUrl = videoMetadata?.fifeUrl || videoMetadata?.servingBaseUri;
                const mediaId = videoMetadata?.mediaGenerationId;
                if (!videoUrl || !mediaId) {
                    throw new Error("Tạo Video thành công nhưng không tìm thấy URL/MediaId.");
                }
                sendLog(prompt.id, `Tạo video Thành công!`, "processing");
                return { videoUrl, mediaId };
            } else if (opResult?.status === "MEDIA_GENERATION_STATUS_FAILED") {
                const errorMessage = opResult?.error?.message || "Lỗi I2V không xác định từ Veo.";
                throw new Error(errorMessage);
            } else {
                 sendLog(prompt.id, `Trạng thái Video : ${apiStatus}`, "processing");
            }
        }
        if (stopExtendedVideoFlag) throw new Error("Đã dừng");
    } catch (processingError: any) {
        sendLog(prompt.id, `Lỗi Khi tạo: ${processingError.message}`, 'error');
        throw processingError;
    }
    throw new Error("Lỗi không xác định.");
};
// =================================================================
// 6. LOGIC TẠO VIDEO TỪ KHUNG HÌNH (I2V)
// =================================================================
ipcMain.on("video:create-from-frames", async (event, { prompts, authToken, aspectRatio, autoSaveConfig, currentUser, concurrentStreams }) => {
    // ... (Giữ nguyên logic "video:create-from-frames", chỉ đảm bảo các hàm processSingle... và uploadImage ở trên) ...
    const mainWindow = BrowserWindow.fromWebContents(event.sender);
    if (!mainWindow) return;
    if (!currentUser || !currentUser.subscription || new Date(currentUser.subscription.end_date) < new Date()) {
        const title = !currentUser || !currentUser.subscription ? 'Yêu Cầu Nâng Cấp' : 'Gói Đã Hết Hạn';
        const message = !currentUser || !currentUser.subscription ? 'Bạn cần nâng cấp gói để sử dụng tính năng này.' : 'Gói đăng ký của bạn đã hết hạn.';
        dialog.showMessageBox(mainWindow, { type: 'warning', title, message });
        mainWindow.webContents.send("navigate-to-view", 'packages');
        return;
    }
    stopAutomationFlag = false;
    const PROMPTS_PER_PROJECT = 4;
    const MAX_COOKIE_RETRIES = 5;
    const MAX_SETUP_RETRIES = 3;
    const sendLog = (promptId: string | null, message: string, status: string, videoUrl: string | null = null, operationName: string | null = null, sceneId: string | null = null, mediaId: string | null = null, projectId: string | null = null, cookie: any = null) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("browser:log", { promptId, message, status, videoUrl, operationName, sceneId, mediaId, projectId, cookie });
        }
        console.log(`[${promptId || "general"}] ${message}`);
    };
    class FrameProjectProcessor {
        promptsToProcess: any[];
        authToken: string;
        onHalfComplete: () => void;
        onAllPromptsSettled: () => void;
        aspectRatio: 'LANDSCAPE' | 'PORTRAIT';
        constructor(
            prompts: any[], authToken: string, onHalfComplete: () => void,
            onAllPromptsSettled: () => void, aspectRatio: 'LANDSCAPE' | 'PORTRAIT'
        ) {
            this.promptsToProcess = prompts; this.authToken = authToken;
            this.onHalfComplete = onHalfComplete; this.onAllPromptsSettled = onAllPromptsSettled;
            this.aspectRatio = aspectRatio;
        }
        async processPromptWithRetries(prompt: any, initialProjectId: string, initialCookie: any): Promise<boolean> {
             if (!prompt.text || typeof prompt.text !== 'string' || prompt.text.trim() === '') {
                 sendLog(prompt.id, `Lỗi: Nội dung Prompt không được để trống. Bỏ qua prompt này.`, "error"); return false;
             }
             if (!prompt.startImageBase64) {
                 sendLog(prompt.id, `Lỗi: Cần có ảnh bắt đầu. Bỏ qua prompt này.`, "error"); return false;
             }
            let currentCookie = initialCookie;
            let currentProjectId = initialProjectId;
            for (let cookieAttempt = 0; cookieAttempt < MAX_COOKIE_RETRIES; cookieAttempt++) {
                if (stopAutomationFlag) return false;
                if (cookieAttempt > 0) {
                    try {
                        sendLog(prompt.id, `Dtlvckm...`, 'running');
                        const cookieResponse = await fetch('https://mmoreal.com/api/prf.php', { headers: { 'Authorization': `Bearer ${this.authToken}` } });
                        const cookieData = await cookieResponse.json();
                        if (!cookieData.success) throw new Error("Không thể lấy cookie mới.");
                        currentCookie = cookieData.cookie;
                        const createProjectResponse = await handleApiRequest(null, {
                            url: 'https://labs.google/fx/api/trpc/project.createProject', cookie: currentCookie,
                            options: { method: 'POST', body: { json: { projectTitle: `Veo Frame Batch (Retry ${cookieAttempt}) - ${Date.now()}`, toolName: "PINHOLE" } } }
                        });
                        currentProjectId = createProjectResponse?.result?.data?.json?.result?.projectId;
                        if (!currentProjectId) throw new Error("Không thể tạo project mới.");
                        sendLog(prompt.id, `Dcprjm: ${currentProjectId}`, 'running');
                    } catch (e: any) {
                        sendLog(prompt.id, `Dlckm: ${e.message}`, 'error');
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        continue;
                    }
                }
                try {
                    await processSingleFramePromptInBatch(mainWindow, prompt, currentProjectId, currentCookie, this.aspectRatio, autoSaveConfig);
                    return true;
                } catch (processingError: any) {
                    if (processingError.message !== "Nội dung Prompt không được để trống." && processingError.message !== "Cần có ảnh Bắt đầu.") {
                         sendLog(prompt.id, `Dtlvckm...`, 'running');
                    } else {
                         return false;
                    }
                }
            }
            sendLog(prompt.id, `Tạo video thất bại.`, "error");
            return false;
        }
        async run() {
             let initialCookie: any = null;
            let initialProjectId: string | null = null;
            let setupSuccess = false;
            for (let setupAttempt = 0; setupAttempt < MAX_SETUP_RETRIES; setupAttempt++) {
                if (stopAutomationFlag) break;
                try {
                    sendLog(null, `Dktl...`, "running");
                    const cookieResponse = await fetch('https://mmoreal.com/api/prf.php', { headers: { 'Authorization': `Bearer ${this.authToken}` } });
                    const cookieData = await cookieResponse.json();
                    if (!cookieData.success) throw new Error("Không thể lấy cookie.");
                    initialCookie = cookieData.cookie;
                    const createProjectResponse = await handleApiRequest(null, {
                        url: 'https://labs.google/fx/api/trpc/project.createProject', cookie: initialCookie,
                        options: { method: 'POST', body: { json: { projectTitle: `Veo Frame Batch - ${Date.now()}`, toolName: "PINHOLE" } } }
                    });
                    initialProjectId = createProjectResponse?.result?.data?.json?.result?.projectId;
                    if (!initialProjectId) throw new Error("Không thể tạo project.");
                    sendLog(null, `Ktltc: ${initialProjectId}.`, "running");
                    setupSuccess = true; break;
                } catch (setupError: any) {
                    sendLog(null, `Lỗi khởi tạo lô, vui lòng Đăng nhập lại: ${setupError.message}`, "error");
                    if (setupAttempt < MAX_SETUP_RETRIES - 1) await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
            if (!setupSuccess) {
                sendLog(null, `Không thể khởi tạo lô, Vui lòng đăng nhập lại.`, "error");
                this.promptsToProcess.forEach(p => sendLog(p.id, "Lỗi khởi tạo lô, không thể tiếp tục.", "error"));
                this.onHalfComplete(); this.onAllPromptsSettled(); return;
            }
            let completedOrFailedCount = 0;
            let halfCompleteCalled = false;
            const triggerPoint = Math.min(2, this.promptsToProcess.length);
            const tasks = this.promptsToProcess.map(prompt =>
                this.processPromptWithRetries(prompt, initialProjectId!, initialCookie)
                    .finally(() => {
                        if (stopAutomationFlag) return;
                        completedOrFailedCount++;
                        if (completedOrFailedCount === triggerPoint && !halfCompleteCalled) {
                            halfCompleteCalled = true;
                            sendLog(null, `Đã xử lý...`, "running");
                            this.onHalfComplete();
                        }
                    })
            );
            await Promise.all(tasks);
            this.onAllPromptsSettled();
        }
    }
    const runQueueManager = async () => {
        const mainPromptQueue = [...prompts];
        const totalPromptsToProcess = mainPromptQueue.length;
        let totalPromptsSettled = 0;
        const maxParallelProjects = Math.ceil(concurrentStreams / PROMPTS_PER_PROJECT);
        let activeProjects = 0;
        sendLog(null, `Bắt đầu xử lý.`, "running");
        const launchNextBatch = () => {
            if (stopAutomationFlag || activeProjects >= maxParallelProjects || mainPromptQueue.length === 0) {
                 if (activeProjects === 0 && mainPromptQueue.length === 0 && totalPromptsSettled === totalPromptsToProcess) {
                 }
                return;
            }
            activeProjects++;
            const batch = mainPromptQueue.splice(0, PROMPTS_PER_PROJECT);
            sendLog(null, `Ktlm.`, "running");
            const onHalfComplete = () => { activeProjects--; sendLog(null, `Giải phóng luồng. Đang chạy: ${activeProjects}.`, "running"); launchNextBatch(); };
            const onAllPromptsSettled = () => {
                totalPromptsSettled += batch.length;
                sendLog(null, `Hoàn thành lô. Tổng: ${totalPromptsSettled}/${totalPromptsToProcess}.`, "running");
                if (totalPromptsSettled === totalPromptsToProcess) {
                     sendLog(null, stopAutomationFlag ? "===== Xử lý (từ frame) đã dừng =====" : "===== Đã xử lý tất cả prompt (từ frame)! =====", "finished");
                }
                 if (batch.length < 2 && activeProjects === 0) {
                      launchNextBatch();
                 }
            };
            const processor = new FrameProjectProcessor(batch, authToken, onHalfComplete, onAllPromptsSettled, aspectRatio);
            processor.run();
        };
        for (let i = 0; i < maxParallelProjects; i++) launchNextBatch();
        if (totalPromptsToProcess === 0) sendLog(null, "Không có prompt nào để xử lý.", "finished");
    };
    runQueueManager();
});


// =================================================================
// 7. LOGIC TẠO VIDEO MỞ RỘNG (TUẦN TỰ) (MỚI)
// =================================================================

// --- Kênh dừng ---
ipcMain.on('extended-video:stop', () => {
    console.log('Received stop extended video signal.');
    stopExtendedVideoFlag = true;
});

// --- Kênh Gửi Log (kênh riêng) ---
const sendExtendedLog = (promptId: string | null, message: string, status: string, videoUrl: string | null = null) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('extended-video:log', { 
            promptId, message, status, videoUrl 
        });
    }
    console.log(`[ExtendedVideo ${promptId || 'general'}] ${message}`);
};

// --- Handler IPC Chính ---
// *** CẬP NHẬT: Thêm useInitialImage và initialImageBase64 ***
ipcMain.on('extended-video:start', async (event, { prompts, authToken, model, aspectRatio, autoSaveConfig, currentUser, useInitialImage, initialImageBase64 }) => {
    if (!mainWindow) return;

    if (!currentUser || !currentUser.subscription || new Date(currentUser.subscription.end_date) < new Date()) {
        const message = !currentUser?.subscription ? "Bạn cần nâng cấp gói." : "Gói đăng ký đã hết hạn.";
        dialog.showMessageBox(mainWindow, { type: 'warning', title: 'Yêu Cầu Nâng Cấp', message });
        mainWindow.webContents.send("navigate-to-view", "packages");
        return;
    }

    stopExtendedVideoFlag = false;
    let initialCookie: any = null;
    let initialProjectId: string | null = null;
    const tempDir = path.join(app.getPath('temp'), `veo-extended-${Date.now()}`);
    const tempVideoPaths: string[] = [];
    // *** CẬP NHẬT: Khởi tạo lastFrameBase64 với ảnh input nếu có ***
    let lastFrameBase64: string | null = useInitialImage ? initialImageBase64 : null;

    try {
        await fs.promises.mkdir(tempDir, { recursive: true });

        sendExtendedLog(null, "Đang lấy cookie và project...", "running");
        try {
            const cookieResponse = await fetch('https://mmoreal.com/api/prf.php', { headers: { 'Authorization': `Bearer ${authToken}` } });
            const cookieData = await cookieResponse.json();
            if (!cookieData.success) throw new Error("Không thể lấy cookie.");
            initialCookie = cookieData.cookie;

            const createProjectResponse = await handleApiRequest(null, {
                url: 'https://labs.google/fx/api/trpc/project.createProject',
                cookie: initialCookie,
                options: { method: 'POST', body: { json: { projectTitle: `Veo Extended - ${Date.now()}`, toolName: "PINHOLE" } } }
            });
            initialProjectId = createProjectResponse?.result?.data?.json?.result?.projectId;
            if (!initialProjectId) throw new Error("Không thể tạo project.");
        } catch (setupError: any) {
             sendExtendedLog(null, `Lỗi khởi tạo: ${setupError.message}`, 'error');
             throw setupError;
        }

        if (stopExtendedVideoFlag) throw new Error("Đã dừng");

        for (const prompt of prompts) {
            if (stopExtendedVideoFlag) throw new Error("Đã dừng bởi người dùng.");

            sendExtendedLog(prompt.id, 'Bắt đầu...', 'running');
            let generatedVideoUrl: string | null = null;
            const currentTempVideoPath = path.join(tempDir, `segment_${prompt.originalIndex}.mp4`);
            const currentFramePath = path.join(tempDir, `frame_${prompt.originalIndex}.png`);

            if (prompt.originalIndex === 0) {
                // *** LOGIC MỚI: Kiểm tra ảnh input ban đầu ***
                if (useInitialImage) {
                    // Nếu bật, prompt đầu tiên là I2V
                    if (!lastFrameBase64) { // lastFrameBase64 đáng lẽ phải được set từ initialImageBase64
                        throw new Error("Lỗi: 'Sử dụng ảnh input' được bật nhưng không có ảnh nào được cung cấp.");
                    }
                    const { videoUrl } = await runI2V_Sequential(
                        prompt, initialProjectId!, initialCookie, lastFrameBase64, aspectRatio, sendExtendedLog
                    );
                    generatedVideoUrl = videoUrl;
                } else {
                    // Nếu tắt, prompt đầu tiên là T2V (như cũ)
                    const { videoUrl } = await runT2V_Sequential(
                        prompt, initialProjectId!, initialCookie, model, aspectRatio, sendExtendedLog
                    );
                    generatedVideoUrl = videoUrl;
                }
            } else {
                // Các prompt sau (2, 3, ...) luôn là I2V
                if (!lastFrameBase64) {
                    throw new Error(`Lỗi nội bộ: Thiếu frame cuối từ prompt #${prompt.originalIndex}.`);
                }
                const { videoUrl } = await runI2V_Sequential(
                    prompt, initialProjectId!, initialCookie, lastFrameBase64, aspectRatio, sendExtendedLog
                );
                generatedVideoUrl = videoUrl;
            }
            // *** KẾT THÚC LOGIC MỚI ***

            if (!generatedVideoUrl) throw new Error("Không nhận được URL video từ hàm xử lý.");

            sendExtendedLog(prompt.id, 'Đang tải video tạm...', 'downloading');
            await downloadVideoToPath(generatedVideoUrl, currentTempVideoPath);
            tempVideoPaths.push(currentTempVideoPath);
            
            sendExtendedLog(prompt.id, 'Tải tạm xong, đang trích xuất...', 'processing', `file://${currentTempVideoPath}`);

            await extractLastFrame(currentTempVideoPath, currentFramePath);
            lastFrameBase64 = await convertImageToBase64(currentFramePath);
            
            sendExtendedLog(prompt.id, 'Hoàn thành phân cảnh!', 'success', `file://${currentTempVideoPath}`);
        }

        if (stopExtendedVideoFlag) throw new Error("Đã dừng trước khi ghép.");
        if (tempVideoPaths.length === 0) throw new Error("Không có video nào để ghép.");
        if (tempVideoPaths.length !== prompts.length) throw new Error("Số lượng video tạm không khớp số prompt, đã có lỗi xảy ra.");
        
        sendExtendedLog(null, 'Đang ghép video...', 'processing');
        
        let finalOutputPath: string;
        if (autoSaveConfig.enabled && autoSaveConfig.path) {
            const finalSaveDirectory = autoSaveConfig.path;
            if (!fs.existsSync(finalSaveDirectory)) {
                fs.mkdirSync(finalSaveDirectory, { recursive: true });
            }
            const finalFilename = `Extended_${Date.now()}.mp4`;
            finalOutputPath = path.join(finalSaveDirectory, finalFilename);

             if (fs.existsSync(finalOutputPath) && !autoSaveConfig.allowOverwrite) {
                 try { fs.unlinkSync(finalOutputPath); } catch(e) { /* ignore */ }
             } else if (fs.existsSync(finalOutputPath) && autoSaveConfig.allowOverwrite) {
                finalOutputPath = path.join(finalSaveDirectory, `Extended_${Date.now()}_${Math.floor(Math.random() * 1000)}.mp4`);
             }

        } else {
             sendExtendedLog(null, 'Tự động lưu đang tắt. Video cuối cùng sẽ bị xóa.', 'error');
             throw new Error("Tự động lưu đang tắt.");
        }

        await mergeVideosInternal(tempVideoPaths, finalOutputPath);

        sendExtendedLog(null, `Ghép thành công!`, 'finished', finalOutputPath);

    } catch (error: any) {
        console.error('Lỗi quy trình video mở rộng:', error);
        sendExtendedLog(null, `Lỗi: ${error.message}`, 'finished');
    } finally {
        try {
            if (fs.existsSync(tempDir)) {
                await fs.promises.rm(tempDir, { recursive: true, force: true });
                console.log(`Đã dọn dẹp thư mục tạm: ${tempDir}`);
            }
        } catch (cleanupError) {
            console.error('Không thể dọn dẹp thư mục tạm:', cleanupError);
        }
    }
});


// =================================================================
// 8. LOGIC TỰ ĐỘNG CẬP NHẬT
// =================================================================
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function sendUpdateMessage(window: BrowserWindow | null, message: string, data: any = null) {
    // ... (Giữ nguyên logic)
    if (window && !window.isDestroyed()) {
        window.webContents.send('update-message', message, data);
    }
}

// =================================================================
// 9. HÀM TẠO CỬA SỔ CHÍNH VÀ VÒNG ĐỜI ỨNG DỤNG
// =================================================================
function createWindow() {
  // ... (Giữ nguyên logic)
  const primaryDisplay = electronScreen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  mainWindow = new BrowserWindow({
    width,
    height,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.js"),
      devTools: isDev,
      webSecurity: !isDev
    }
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    mainWindow.once('ready-to-show', () => {
        autoUpdater.checkForUpdatesAndNotify();
    });
  }

  autoUpdater.on('update-available', (info) => {
      sendUpdateMessage(mainWindow, 'update-available', info);
      autoUpdater.downloadUpdate();
  });
  autoUpdater.on('update-not-available', (info) => {
      sendUpdateMessage(mainWindow, 'update-not-available', info);
  });
  autoUpdater.on('download-progress', (progressObj) => {
      sendUpdateMessage(mainWindow, 'download-progress', progressObj);
  });
  autoUpdater.on('update-downloaded', (info) => {
      sendUpdateMessage(mainWindow, 'update-downloaded', info);
  });
  autoUpdater.on('error', (err) => {
      sendUpdateMessage(mainWindow, 'error', err.message);
  });
}

app.whenReady().then(() => {
    // ... (Giữ nguyên logic)
    session.defaultSession.protocol.registerFileProtocol('file', (request, callback) => {
        const filePath = decodeURI(request.url.replace('file:///', ''));
        callback(filePath);
    });

  if (!isDev) {
      session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
          callback({
              responseHeaders: {
                  ...details.responseHeaders,
                  'Content-Security-Policy': ["script-src 'self'; media-src 'self' file:;"]
              }
          });
      });
  }

  ipcMain.handle("fetch-api", handleApiRequest);
  createWindow();
});


ipcMain.on('restart-and-install', () => {
    autoUpdater.quitAndInstall();
});

ipcMain.on('app:force-reload-window', () => {
    if (mainWindow) {
        mainWindow.webContents.reloadIgnoringCache();
    }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});