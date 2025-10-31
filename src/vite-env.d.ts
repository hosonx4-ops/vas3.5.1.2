// src/vite-env.d.ts
// THÊM: AutomationPrompt, AutoSaveConfig, ProfileData, UserCookie, WhiskTask, AspectRatio
import { UserCookie, AutomationState, AutoSaveConfig, AutomationPrompt, WhiskTask, AspectRatio } from './types';
import { ProfileData } from './context/AppContext';

declare module '*.css';

// Định nghĩa kiểu cho đối tượng log (AutoBrowser, I2V)
type BrowserLog = {
  promptId: string | null;
  message: string;
  status?: string;
  videoUrl?: string;
  operationName?: string;
  sceneId?: string;
  mediaId?: string;
  projectId?: string;
  cookie?: UserCookie;
};

// Định nghĩa kiểu cho log video mở rộng (Sửa lỗi 'any' type)
type ExtendedVideoLog = {
  promptId: string | null;
  message: string;
  status: string;
  videoUrl?: string | null;
};


declare global {
  interface Window {
    electronAPI: {
      fetch: (url: string, cookie: UserCookie, options: RequestInit) => Promise<any>;
      
      // API AutoBrowser
      startBrowserAutomation: (args: {
        prompts: AutomationPrompt[],
        authToken: string,
        model: string,
        aspectRatio: 'LANDSCAPE' | 'PORTRAIT',
        autoSaveConfig: AutoSaveConfig;
        currentUser: ProfileData | null;
        concurrentStreams: number;
      }) => void;
      stopBrowserAutomation: () => void;

      // API Video từ Frames (I2V)
      videoCreateFromFrames: (args: {
        prompts: AutomationPrompt[],
        authToken: string,
        aspectRatio: 'LANDSCAPE' | 'PORTRAIT',
        autoSaveConfig: AutoSaveConfig;
        currentUser: ProfileData | null;
        concurrentStreams: number;
      }) => void;

      // V-- API MỚI CHO VIDEO MỞ RỘNG (SỬA LỖI & CẬP NHẬT) --V
      startExtendedVideoAutomation: (args: {
        prompts: AutomationPrompt[],
        authToken: string,
        model: string,
        aspectRatio: 'LANDSCAPE' | 'PORTRAIT',
        autoSaveConfig: AutoSaveConfig;
        currentUser: ProfileData | null;
        // Cập nhật: Thêm các trường mới
        useInitialImage: boolean;
        initialImageBase64?: string | null | undefined;
      }) => void;
      stopExtendedVideoAutomation: () => void;
      onExtendedVideoLog: (callback: (log: ExtendedVideoLog) => void) => () => void; // Dùng kiểu ExtendedVideoLog
      // ^-- HẾT API MỚI --^

      // --- API Whisk (Đã có) ---
      uploadImageForRecipe: (cookie: UserCookie, base64Data: string, workflowId: string, sessionId: string) => Promise<{ mediaGenerationId?: string; error?: string }>;
      generateWhiskImageRecipe: (
          cookie: UserCookie,
          workflowId: string,
          userInstruction: string, // Main prompt text
          seed: number,
          aspectRatio: AspectRatio,
          recipeMediaInputs: { mediaGenerationId: string; caption?: string }[], // Array of image inputs
          sessionId: string
      ) => Promise<{ encodedImage?: string; error?: string }>;
      // ---------------------------

      // API Tải file & Tiện ích
      downloadVideo: (args: { url: string; promptText: string; savePath?: string | null; promptIndex?: number; }) => void;
      downloadImage: (args: { imageDataUrl: string; storyTitle: string; }) => void;
      
      // *** FIX: Thêm promptIndex vào saveImageToDisk (cho Whisk) ***
      saveImageToDisk: (base64Data: string, savePath: string, filename: string, promptIndex: number) => Promise<{ success: boolean; path?: string; error?: string }>;

      selectDownloadDirectory: () => Promise<string | null>;
      importPromptsFromFile: () => Promise<{ success: boolean; prompts?: string[]; error?: string; }>;
      importJsonPromptsFromFile: () => Promise<{ success: boolean; prompts?: string[]; error?: string; }>;
      getAppVersion: () => Promise<string>;
      onDownloadComplete: (callback: (result: {success: boolean, path?: string, error?: string}) => void) => () => void;
      
      // *** FIX: Dùng kiểu BrowserLog cụ thể ***
      onBrowserLog: (callback: (log: BrowserLog) => void) => () => void;
      
      onCookieUpdate: (callback: (cookie: UserCookie) => void) => () => void;
      onNavigateToView: (callback: (viewName: string) => void) => () => void;

      // API Tự động cập nhật
      checkForUpdates: () => void;
      onUpdateMessage: (callback: (message: string, data?: any) => void) => () => void;
      restartAndInstall: () => void;

      // API Ghép Video
      selectVideoFiles: () => Promise<string[] | null>;
      mergeVideos: (args: { videoPaths: string[]; savePath?: string }) => Promise<{ success: boolean; path?: string; error?: string }>;
      onMergeProgress: (callback: (progress: any) => void) => () => void;
      stopMerge: () => Promise<void>;

      // Tiện ích
      copyText: (text: string) => void;
      openExternalLink: (url: string) => Promise<void>;
      forceReloadWindow: () => void;
    };
  }
}

export {};