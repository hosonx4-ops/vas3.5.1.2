// src/types.ts
export enum AppView {
    DASHBOARD,
    CREATE_STORY,
    CREATE_PROMPTS,
    CREATE_THUMBNAIL,
    CREATE_VIDEO,
    AUTO_CREATE,
    AUTO_BROWSER,
    HISTORY,
    GET_YOUTUBE_SCRIPT,
    API_KEY,
    MANAGE_COOKIES,
    PROFILE,
    PACKAGES,
    SUPPORT,
    MERGE_VIDEOS,
    CREATE_VIDEO_FROM_IMAGE,
    CREATE_VIDEO_FROM_FRAMES,
    CREATE_WHISK_IMAGE,
    CREATE_EXTENDED_VIDEO // <-- MỤC MỚI
}

export interface Character {
    id: string;
    name: string;
    description: string;
}

export type GeminiModelSelection = 'auto' | 'gemini-2.5-flash' | 'gemini-2.0-flash' | 'gemini-2.5-flash-lite-preview-09-2025';

export interface AutoCreateConfig {
    storyStyle: string;
    storyLength: string;
    promptStyle: string[];
    promptGenre: string;
    promptType: 'detailed' | 'comprehensive';
    videoModel: string;
    videoAspectRatio: 'LANDSCAPE' | 'PORTRAIT';
    concurrentStreams: number;
    autoSave: boolean;
    savePath: string | null;
}

export interface User {
    id: number;
    username: string;
    email: string;
    role: 'user' | 'admin';
    status: 'pending' | 'active' | 'inactive';
    created_at: string;
}

export interface Story {
    id: string;
    title: string;
    content: string;
    source: string;
}

export interface VideoPrompt {
    id:string;
    storyId: string;
    storyTitle: string;
    prompt: string;
}

export interface GeneratedImage {
    id: string;
    storyId: string;
    storyTitle: string;
    imageUrl: string;
}

export type VideoStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed' | 'success';

export interface GeneratedVideo {
    id: string;
    promptId: string;
    promptText: string;
    status: VideoStatus;
    videoUrl?: string;
    localPath?: string;
    progressMessage?: string;
    operationName?: string;
    mediaId?: string;
    projectId?: string;
    aspectRatio?: 'LANDSCAPE' | 'PORTRAIT';
    upsampleStatus?: VideoStatus;
    upsampledVideoUrl?: string;
    upsampleOperationName?: string;
    cookie?: UserCookie;
}

export interface YouTubeScript {
    id: string;
    sourceUrl: string;
    script: string;
    request: string;
}

export interface UserCookie {
  id: string;
  name: string;
  value: string;
  bearerToken?: string;
}

export interface ToastMessage {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface LabsProject {
  id: string;
  name: string;
}

export interface AutoSaveConfig {
  enabled: boolean;
  path: string | null;
  allowOverwrite: boolean;
  splitFolders: boolean;
  videosPerFolder: number;
}

export type AutomationStatus = 'idle' | 'running' | 'success' | 'error' | 'queued' | 'downloading' | 'submitting' | 'processing' | 'pending';
export type AutomationPrompt = {
    id: string;
    text: string;
    status: AutomationStatus;
    message: string;
    videoUrl?: string;
    operationName?: string;
    mediaId?: string;
    projectId?: string;
    upsampleStatus?: VideoStatus;
    upsampledVideoUrl?: string;
    upsampleOperationName?: string;
    cookie?: UserCookie;
    originalIndex?: number;
    startImageBase64?: string;
    endImageBase64?: string;
    imageBase64?: string;
};

// State này sẽ được dùng chung cho AutoBrowserView và CreateVideoFromImageView
export type AutomationState = {
    prompts: AutomationPrompt[];
    isRunning: boolean;
    overallProgress: number;
    statusMessage: string;
    model: string;
    aspectRatio: 'LANDSCAPE' | 'PORTRAIT';
    concurrentStreams: number;
    imageAnalysisMode?: 'shared' | 'separate';
};

// *** THÊM STATE ĐỘC LẬP CHO VIDEO MỞ RỘNG ***
// Nó có cấu trúc y hệt AutomationState, nhưng sẽ là một state riêng biệt trong context
export type ExtendedAutomationState = AutomationState;
// *** HẾT PHẦN THÊM MỚI ***

export interface Transaction {
    transaction_id: number;
    package_name: string;
    amount: string;
    currency: string;
    transaction_date: string;
    end_date?: string;
    payment_status: 'pending' | 'completed' | 'failed' | 'refunded' | 'cancelled';
    description: string;
}

export interface GeneratedMetadata {
    id: string;
    storyId: string;
    storyTitle: string;
    title: string;
    description: string;
    hashtags: string[];
}

export type AspectRatio = 'LANDSCAPE' | 'PORTRAIT';
export type WhiskTaskStatus = 'idle' | 'processing' | 'success' | 'failed' | 'queued';

export interface WhiskTask {
  id: string;
  prompt: string;
  aspectRatio: AspectRatio;
  seed: number;
  status: WhiskTaskStatus;
  imageUrl: string | null;
  error: string | null;
  workflowId: string | null;
  isSelected: boolean;
  message?: string;
  imageInputs?: {
    id: string;
    base64?: string;
    preview?: string;
    mediaGenerationId?: string | null;
    file?: File | null;
  }[];
}

export interface WhiskAutomationState {
    tasks: WhiskTask[];
    isRunning: boolean;
    useImageInput: boolean;
}

export interface WhiskAutoSaveConfig {
    enabled: boolean;
    path: string | null;
}

export interface WhiskImage {
    id: string;
    prompt: string;
    imageUrl: string;
    seed: number;
    workflowId: string;
    aspectRatio: 'LANDSCAPE' | 'PORTRAIT';
}