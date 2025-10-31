// src/services/whiskService.ts
import { UserCookie, AspectRatio } from '../types';

/**
 * Hàm fetch API qua main process của Electron.
 */
async function fetchViaMain(url: string, cookie: UserCookie | null, options: RequestInit = {}): Promise<any> {
    if (!window.electronAPI) {
        throw new Error('Electron API is not available.');
    }
    return window.electronAPI.fetch(url, cookie || { id: '', name: '', value: '' }, options);
}

/**
 * Hàm lấy Cookie/Token mới nhất của Google Labs từ server mmoreal.com
 * Yêu cầu token đăng nhập của mmoreal.com.
 */
const fetchGoogleCookie = async (mmorealToken: string): Promise<UserCookie> => {
    const response = await fetchViaMain(
        'https://mmoreal.com/api/abzh.php',
        null,
        {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${mmorealToken}` }
        }
    );
    if (!response.success || !response.cookie || !response.cookie.value || !response.cookie.bearerToken) {
        throw new Error('Không thể lấy Cookie/Token hợp lệ từ server. Vui lòng kiểm tra Cookie/Token trên server mmoreal.');
    }
    return response.cookie as UserCookie;
};


/**
 * Tạo một Workflow (Project) mới trên Labs để chuẩn bị cho việc tạo ảnh.
 * Tự động lấy Cookie từ abzh.php.
 */
export const createWhiskWorkflow = async (mmorealToken: string): Promise<{ workflowId: string, googleCookie: UserCookie }> => {
    const url = 'https://labs.google/fx/api/trpc/media.createOrUpdateWorkflow';
    const googleCookie = await fetchGoogleCookie(mmorealToken);
    const sessionId = `session-${Date.now()}`;
    const requestBody = {
        json: {
            clientContext: { tool: "BACKBONE", sessionId: sessionId },
            mediaGenerationIdsToCopy: [],
            workflowMetadata: { workflowName: `Whisk Image Gen: ${new Date().toLocaleString()}` }
        }
    };
    const response = await fetchViaMain(url, googleCookie, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'x-labs-client-name': 'FX_WEB', 'Content-Type': 'application/json' }
    });
    const resultWorkflowId = response?.result?.data?.json?.result?.workflowId;
    if (!resultWorkflowId) {
        console.error("Lỗi tạo Workflow:", response);
        throw new Error('Không thể tạo workflow. Phản hồi không chứa workflowId.');
    }
    return { workflowId: resultWorkflowId, googleCookie };
};

/**
 * Tải ảnh lên Google Labs (Backbone) để sử dụng làm input.
 * *** CẬP NHẬT: Quay lại sử dụng rawBytes theo đề xuất. ***
 * *** Sửa lỗi bằng cách dùng mimeType động thay vì "image/jpeg" cứng. ***
 */
export const uploadWhiskImage = async (
    googleCookie: UserCookie,
    workflowId: string,
    imageBase64: string, // Chỉ base64 data
    mimeType: string    // MimeType đã bóc tách (vd: "image/png")
): Promise<string> => {
    
    const url = 'https://labs.google/fx/api/trpc/backbone.uploadImage';
    const sessionId = `session-${Date.now()}`;

    // *** QUAY LẠI DÙNG rawBytes, nhưng với MimeType động ***
    // Đây là sự kết hợp của file gốc (Turn 3) và logic bóc tách (Turn 7/11)
    const requestBody = {
      json: {
        clientContext: {
          sessionId: sessionId,
          workflowId: workflowId,
          tool: "BACKBONE"
        },
        uploadMediaInput: {
          mediaCategory: "MEDIA_CATEGORY_SUBJECT",
          // Sử dụng `rawBytes` với data URL được xây dựng động
          rawBytes: `data:${mimeType};base64,${imageBase64}`
        }
      }
    };

    const response = await fetchViaMain(url, googleCookie, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
            'x-labs-client-name': 'FX_WEB',
            'Content-Type': 'application/json'
        }
    });

    const mediaGenerationId = response?.result?.data?.json?.result?.uploadMediaGenerationId;

    if (!mediaGenerationId) {
        console.error("Lỗi tải ảnh Whisk (backbone.uploadImage):", response);
        
        let apiErrorMessage = 'Lỗi không xác định';
        if (response?.error?.json?.message) {
            // Lỗi E007 (500)
            apiErrorMessage = response.error.json.message;
        } else if (response?.result?.data?.json?.error?.message) {
            // Lỗi E008 (400)
            apiErrorMessage = response.result.data.json.error.message;
        } else if (response?.error?.message) {
            apiErrorMessage = response.error.message;
        }

        // Phân biệt lỗi E007 và E008
        if (apiErrorMessage.includes('INTERNAL_SERVER_ERROR') || apiErrorMessage.includes('Missing bytes')) {
             throw new Error(`(E007) - API Response: ${apiErrorMessage}`);
        }
        // Lỗi E008 gốc của bạn là PUBLIC_ERROR_MINOR_INPUT_IMAGE
        throw new Error(`(E008) - API Response: ${apiErrorMessage}`);
    }
    
    console.log("Upload image successful, mediaGenerationId:", mediaGenerationId);
    return mediaGenerationId;
};


/**
 * Gửi yêu cầu tạo ảnh đến Whisk (Imagen 3.5 hoặc R2I).
 * Có thể tạo chỉ bằng prompt hoặc dùng thêm ảnh đầu vào.
 */
export const generateWhiskImage = async (
    googleCookie: UserCookie,
    workflowId: string,
    prompt: string,
    seed: number,
    aspectRatio: AspectRatio,
    mediaGenerationIds?: string[] // Optional: ID của ảnh đã tải lên
): Promise<string> => {
    const sessionId = `session-${Date.now()}`;

    if (!googleCookie.bearerToken) {
         throw new Error('Cookie/Token không chứa Bearer Token cần thiết cho API Whisk.');
    }

    let url: string;
    let requestBody: any;

    if (mediaGenerationIds && mediaGenerationIds.length > 0) {
        // --- Chế độ dùng ảnh đầu vào ---
        url = 'https://aisandbox-pa.googleapis.com/v1/whisk:runImageRecipe';
        requestBody = {
            "clientContext": {
                "workflowId": workflowId,
                "sessionId": sessionId,
                "tool": "BACKBONE"
            },
            "imageModelSettings": {
                "imageModel": "R2I",
                "aspectRatio": `IMAGE_ASPECT_RATIO_${aspectRatio}`
            },
            "recipeMediaInputs": mediaGenerationIds.map(id => ({
                "mediaInput": {
                    "mediaCategory": "MEDIA_CATEGORY_SUBJECT",
                    "mediaGenerationId": id
                }
            })),
            "seed": seed,
            "userInstruction": prompt
        };
    } else {
        // --- Chế độ chỉ dùng prompt (như cũ) ---
        url = 'https://aisandbox-pa.googleapis.com/v1/whisk:generateImage';
        requestBody = {
            "clientContext": {
                "workflowId": workflowId,
                "sessionId": sessionId,
                "tool": "BACKBONE"
            },
            "imageModelSettings": {
                "imageModel": "IMAGEN_3_5",
                "aspectRatio": `IMAGE_ASPECT_RATIO_${aspectRatio}`
            },
            "mediaCategory": "MEDIA_CATEGORY_BOARD",
            "prompt": prompt,
            "seed": seed
        };
    }

    const response = await fetchViaMain(url, googleCookie, {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: {
            'Content-Type': 'text/plain;charset=UTF-8'
        }
    });

    // Trích xuất ảnh base64 từ response
    let encodedImage: string | undefined;
    encodedImage = response?.imagePanels?.[0]?.generatedImages?.[0]?.encodedImage;

    if (!encodedImage) {
        console.error("Whisk Response Lỗi:", response);
        const errorDetails = response?.error?.message || JSON.stringify(response);
        throw new Error(`Không tìm thấy ảnh trong phản hồi từ API Whisk. Chi tiết: ${errorDetails} (URL: ${url})`);
    }

    return encodedImage; // Trả về ảnh base64 (không có prefix)
};