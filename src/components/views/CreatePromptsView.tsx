import React, { useState, useMemo, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { createVideoPrompts, extractCharacterSheet, createCharacterSheetFromImage, fileToGenerativePart, createCancellationController, AbortError, CancellationController } from '../../services/geminiService';
import { useToast } from '../../context/ToastContext';
import Spinner from '../common/Spinner';
import { AppView, AutomationPrompt, VideoPrompt, Character, GeminiModelSelection } from '../../types';

type ViewTab = 'create' | 'history' | 'collection';
type InputTab = 'select' | 'manual';

// Các tùy chọn thiết lập nâng cao
const settingPills = [
    'English prompts language', 'Đồng bộ các nhân vật', 'Đặt tên cho nhân vật và luôn gọi bằng tên đó',
    'Sao chép toàn bộ Character Sheet vào đầu mỗi prompt mới', 'Sử dụng các từ khóa mô tả cảm xúc và biểu cảm khuôn mặt',
    'Sử dụng các từ khóa mô tả góc máy và bố cục khung hình', 'Sử dụng các từ khóa mô tả ánh sáng và màu sắc',
    'Chỉ sao chép Character Sheet xuất hiện trong phân cảnh vào đầu mỗi prompt mới',
    'Viết Character Sheet mô tả các chi tiết không thay đổi của nhân vật như tên tuổi tóc mắt quần áo phụ kiện',
    'tính toán và tạo số lượng prompt đúng với số phút của câu chuyện', 'Tạo các prompt có thể tạo thành một câu chuyện liền mạch',
    'Nếu có nhiều nhân vật hãy viết Character Sheet cho từng nhân vật', 'Liên kết các cảnh cuối của prompt trước với cảnh đầu của prompt sau',
];

// Các tùy chọn phong cách
const stylePills = [
    'Siêu thực', 'Phim', 'Hoạt hình Disney', 'Anime', 'Pixar', 'Truyện tranh', 'Noir', 'Cyberpunk',
    'Màu nước', 'Low-poly 3D', 'Hoạt hình Cartoon 2D', 'Hoạt hình Cartoon 3D', 'Disney', 'Pixel Art', 'Isometric',
    'Paper Cutout', 'Claymation', 'Lịch sử', 'Khoa học', 'Công nghệ', 'Trò chơi điện tử', 'Giáo dục',
    'Hướng dẫn', 'Review sản phẩm', 'Unbox', 'Du lịch', 'Ẩm thực', 'Vlog', 'Thể thao',
    'Tin tức', 'Phim ngắn', 'Hoạt hình ngắn', 'Thuyết minh', 'Hướng dẫn sử dụng sản phẩm',
    'Doodle Video Video vẽ tay', 'Whiteboard Video', 'Infographic Video', 'Video phỏng vấn', 'Video tài liệu','Minecraft',
    'Video quảng cáo', 'Quân sự','Người tiền sử','Người cổ đại','Phong cách Việt Nam',
    'Trailer phim'
];

// Các tùy chọn thể loại
const genres = [
    'Hành động/Chiến đấu', 'Tình cảm/Lãng mạn', 'Hài hước/Vui nhộn', 'Kinh dị/Horror',
    'Bí ẩn/Trinh thám', 'Fantasy/Thần thoại', 'Khoa học viễn tưởng', 'Drama/Chính kịch',
    'Giáo dục/Học tập', 'Phiêu lưu/Thám hiểm', 'Đời thường/Slice of Life', 'Trailer phim','Quân sự','Thuyết minh','Câu chuyện bình thường'
];

// Các tùy chọn quay phim
const cameraLenses = [ 'Ống kính góc rộng', 'Ống kính tele', 'Ống kính macro', 'Ống kính mắt cá', 'Ống kính anamorphic', 'Góc nhìn thứ nhất (FPV)', 'Drone shot' ];
const cameraShots = [ 'Cận cảnh (Close-up)', 'Trung cảnh (Medium shot)', 'Toàn cảnh (Wide shot)', 'Góc thấp (Low angle)', 'Ngang tầm mắt (Eye level)', 'Góc cao (High angle)', 'Dolly in chậm', 'Tĩnh (Static)', 'Lia máy nhẹ nhàng (Slow pan)', 'Theo dõi nhân vật (Tracking shot)' ];
const lightingSetups = [ 'Ánh sáng tự nhiên', 'Ánh sáng 3 điểm', 'High-key', 'Low-key', 'Rembrandt', 'Giờ vàng (Golden hour)', 'Neon', 'Ánh sáng ma mị (Eerie)' ];

// Các tùy chọn khác
const videoDurationOptions = [1, 2, 3, 5, 10, 15, 20];
const voiceLanguageOptions = ['Tiếng Việt', 'English', 'Không có giọng nói'];

// Prompt mặc định khi phân tích ảnh nhân vật
const defaultImagePrompt = "Phân tích ảnh và viết Character Sheet cho (các) nhân vật trong ảnh để làm character đồng nhất nhân vật bao gồm ngoại hình tên tuổi màu da và các thông tin chi tiết khác, bằng tiếng anh.";

interface CreatePromptsViewProps {
    setActiveView: (view: AppView) => void;
}

const CreatePromptsView: React.FC<CreatePromptsViewProps> = ({ setActiveView }) => {
    const {
        stories,
        prompts,
        addPrompts,
        deletePrompts,
        deletePrompt,
        addAutomationPrompts,
        characters,
        addCharacter,
        updateCharacter,
        deleteCharacter,
        geminiModel,
        setGeminiModel,
        setAutomationState // Thêm để import prompt vào tab khác
    } = useAppContext();
    const { showToast } = useToast();

    // State chung
    const [mainTab, setMainTab] = useState<ViewTab>('create');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [progressMessage, setProgressMessage] = useState('');
    const [cancellationController, setCancellationController] = useState<CancellationController | null>(null);

    // State cho form tạo prompt
    const [activeInputTab, setActiveInputTab] = useState<InputTab>('select');
    const [selectedStoryId, setSelectedStoryId] = useState('');
    const [manualStoryContent, setManualStoryContent] = useState('');
    const [granularity, setGranularity] = useState('detailed');
    const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
    const [selectedSettings, setSelectedSettings] = useState<string[]>(['English prompts language']); // Mặc định ngôn ngữ prompt tiếng Anh
    const [selectedGenre, setSelectedGenre] = useState(genres[0]);
    const [customStyle, setCustomStyle] = useState('');
    const [showCustomStyleInput, setShowCustomStyleInput] = useState(false);
    const [customSetting, setCustomSetting] = useState('');
    const [showCustomSettingInput, setShowCustomSettingInput] = useState(false);
    const [customGenre, setCustomGenre] = useState('');
    const [showCustomGenreInput, setShowCustomGenreInput] = useState(false);
    const [videoDuration, setVideoDuration] = useState('1'); // Mặc định 1 phút
    const [customVideoDuration, setCustomVideoDuration] = useState('');
    const [voiceLanguage, setVoiceLanguage] = useState(voiceLanguageOptions[0]); // Mặc định Tiếng Việt
    const [customVoiceLanguage, setCustomVoiceLanguage] = useState('');

    // State cho kết quả prompt đã tạo
    const [generatedPrompts, setGeneratedPrompts] = useState<any[]>([]); // Có thể là string hoặc object (nếu là JSON)
    const [selectedGeneratedPrompts, setSelectedGeneratedPrompts] = useState<any[]>([]);

    // State cho tab lịch sử
    const [historyFilterStoryId, setHistoryFilterStoryId] = useState<string>('');
    const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);

    // State cho tab bộ sưu tập nhân vật
    const [shouldSaveCharacter, setShouldSaveCharacter] = useState(false);
    const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
    const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
    const [characterName, setCharacterName] = useState('');
    const [characterDescription, setCharacterDescription] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [imageUserPrompt, setImageUserPrompt] = useState(defaultImagePrompt);
    const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

    // State cho cài đặt nâng cao
    const [selectedLenses, setSelectedLenses] = useState<string[]>([]);
    const [selectedCameraShots, setSelectedCameraShots] = useState<string[]>([]);
    const [selectedLightings, setSelectedLightings] = useState<string[]>([]);
    const [isJsonOutput, setIsJsonOutput] = useState(false); // State cho tùy chọn JSON output

    // Tạo danh sách tùy chọn lọc lịch sử
    const historyFilterOptions = useMemo(() => {
        // SỬA LỖI: Thêm || [] để tránh crash nếu stories hoặc prompts là null/undefined
        const options = (stories || []).map(story => ({ id: story.id, title: story.title }));
        const manualPromptsMap = new Map<string, string>();
        (prompts || []).forEach(prompt => {
            // SỬA LỖI: Kiểm tra prompt và prompt.storyId tồn tại
            if (prompt && prompt.storyId && prompt.storyId.startsWith('manual-')) {
                if (!manualPromptsMap.has(prompt.storyId)) {
                    // SỬA LỖI: Dùng prompt.storyTitle hoặc title mặc định
                    manualPromptsMap.set(prompt.storyId, prompt.storyTitle || `Manual Story ${prompt.storyId}`);
                }
            }
        });
        manualPromptsMap.forEach((title, id) => { options.push({ id, title }); });
        // SỬA LỖI: Kiểm tra title tồn tại trước khi sort
        options.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        return options;
    }, [stories, prompts]);


    // Lọc danh sách prompt trong lịch sử dựa trên bộ lọc
    const filteredHistoryPrompts = useMemo(() => {
        const allPrompts = prompts || [];
        // *** CẬP NHẬT LOGIC: Không trả về gì nếu chưa chọn bộ lọc ***
        if (!historyFilterStoryId) {
            return []; // Trả về mảng rỗng nếu không có bộ lọc nào được chọn
        }
        // Chỉ lọc khi historyFilterStoryId có giá trị
        // SỬA LỖI: Đảm bảo prompt và prompt.storyId tồn tại khi lọc
        return allPrompts.filter(p => p && p.storyId === historyFilterStoryId);
    }, [prompts, historyFilterStoryId]);


    // Kiểm tra xem tất cả prompt trong lịch sử (đã lọc) có được chọn không
    const areAllHistoryPromptsSelected = useMemo(() => {
        // SỬA LỖI: Luôn kiểm tra filteredHistoryPrompts có tồn tại và length > 0
        if (!filteredHistoryPrompts || filteredHistoryPrompts.length === 0) return false;
        return selectedPromptIds.length === filteredHistoryPrompts.length;
    }, [selectedPromptIds, filteredHistoryPrompts]);


    // Reset lựa chọn trong lịch sử khi bộ lọc thay đổi
    useEffect(() => {
        setSelectedPromptIds([]);
    }, [historyFilterStoryId]);

    // Hàm chọn/bỏ chọn tất cả prompt trong lịch sử
    const handleSelectAllHistoryToggle = () => {
        if (areAllHistoryPromptsSelected) {
            setSelectedPromptIds([]);
        } else {
             // SỬA LỖI: Đảm bảo chỉ map qua prompt hợp lệ có id
            setSelectedPromptIds(filteredHistoryPrompts.filter(p => p && p.id).map(p => p.id));
        }
    };


    // Hàm bật/tắt các tùy chọn style, setting, quay phim
    const handleStyleToggle = (style: string, type: 'style' | 'setting' | 'lens' | 'lighting' | 'shot') => {
        let setFunction;
        switch(type) {
            case 'style': setFunction = setSelectedStyles; break;
            case 'setting': setFunction = setSelectedSettings; break;
            case 'lens': setFunction = setSelectedLenses; break;
            case 'lighting': setFunction = setSelectedLightings; break;
            case 'shot': setFunction = setSelectedCameraShots; break;
        }
        setFunction(prev => prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]);
    };

    // Hàm xử lý khi nhấn nút "Tạo Prompts"
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let storyContent: string;
        let storyForPromptCreation: { id: string; title: string; content: string; source: string; };

        // Lấy nội dung câu chuyện từ tab đang chọn
        if (activeInputTab === 'select') {
            if (!selectedStoryId) { setError('Vui lòng chọn một câu chuyện.'); return; }
            // SỬA LỖI: Thêm || [] để tránh crash
            const story = (stories || []).find(s => s && s.id === selectedStoryId);
            if (!story) { setError('Không tìm thấy câu chuyện.'); return; }
            storyContent = story.content;
            storyForPromptCreation = story;
        } else { // Tab nhập thủ công
            if (!manualStoryContent.trim()) { setError('Vui lòng nhập nội dung câu chuyện.'); return; }
            storyContent = manualStoryContent;
            storyForPromptCreation = { 
                id: `manual-${Date.now()}`, 
                title: `Prompt thủ công: ${storyContent.substring(0, 30)}...`, 
                content: storyContent, 
                source: 'Manual Input' 
            };
        }

        // Reset trạng thái và bắt đầu quá trình tạo
        setIsLoading(true);
        setError('');
        setGeneratedPrompts([]);
        setSelectedGeneratedPrompts([]);

        const controller = createCancellationController();
        setCancellationController(controller);
        
        // Tính toán các giá trị cuối cùng
        const finalVideoDuration = parseInt(videoDuration === 'custom' ? customVideoDuration : videoDuration, 10);
        // Ước tính số prompt cần tạo (mỗi prompt ~8 giây)
        const promptCount = Math.ceil((finalVideoDuration * 60) / 8);
        const finalVoiceLanguage = voiceLanguage === 'custom' ? customVoiceLanguage : voiceLanguage;

        // Gộp các style/setting/genre đã chọn và tùy chỉnh
        const combinedStyle = [
            ...selectedStyles, selectedGenre, customStyle.trim(),
            ...selectedSettings, customSetting.trim(), customGenre.trim()
        ].filter(Boolean).join(', ');
        
        // Lấy danh sách nhân vật đã chọn từ bộ sưu tập
        // SỬA LỖI: Thêm || [] để tránh crash
        const selectedCharacters = (characters || []).filter(c => c && selectedCharacterIds.has(c.id));


        try {
            // Tự động trích xuất và lưu nhân vật nếu được chọn
            if (shouldSaveCharacter) {
                setProgressMessage('Đang trích xuất nhân vật từ câu chuyện...');
                const charResponse = await extractCharacterSheet(storyContent);
                // SỬA LỖI: Kiểm tra response text trước khi parse
                const charData = charResponse.text ? JSON.parse(charResponse.text) : {};
                if (charData.name && charData.description) {
                    const newChar = { id: `char-${Date.now()}`, name: charData.name, description: charData.description };
                    addCharacter(newChar);
                    showToast(`Đã tự động lưu nhân vật: ${newChar.name}`, 'info');
                    // Tự động chọn nhân vật vừa tạo
                    setSelectedCharacterIds(prev => new Set(prev).add(newChar.id));
                    selectedCharacters.push(newChar); // Thêm vào danh sách để sử dụng ngay
                }
            }
            
            // Gọi hàm tạo prompt từ geminiService với đầy đủ tham số
            const response = await createVideoPrompts(
                storyContent, 
                granularity, 
                combinedStyle, 
                selectedCharacters, // Truyền danh sách nhân vật đã chọn
                isJsonOutput, // Truyền tùy chọn output JSON
                selectedLenses, // Truyền ống kính đã chọn
                selectedCameraShots, // Truyền góc máy đã chọn
                selectedLightings, // Truyền ánh sáng đã chọn
                finalVideoDuration, // Truyền thời lượng video (phút)
                finalVoiceLanguage, // Truyền ngôn ngữ giọng nói
                promptCount, // Truyền số lượng prompt cần tạo
                geminiModel, // Truyền model ưu tiên
                setProgressMessage, // Callback cập nhật tiến trình
                controller // Truyền bộ điều khiển hủy
            );
            
            // Xử lý kết quả trả về
            // SỬA LỖI: Kiểm tra response text trước khi parse
            const promptsArray = response.text ? JSON.parse(response.text).prompts : [];
            if (!Array.isArray(promptsArray) || promptsArray.length === 0) throw new Error("API không trả về prompt nào hoặc định dạng không đúng.");
            
            setGeneratedPrompts(promptsArray); // Hiển thị kết quả

            // *** SỬA LỖI [object Object]: Đảm bảo prompt lưu vào lịch sử luôn là string ***
            const newPrompts: VideoPrompt[] = promptsArray.map((p: any) => ({
                id: `${storyForPromptCreation.id}-${Date.now()}-${Math.random()}`,
                storyId: storyForPromptCreation.id,
                storyTitle: storyForPromptCreation.title,
                // Chuyển thành chuỗi JSON nếu là object, ngược lại chuyển thành chuỗi
                prompt: (typeof p === 'object' && p !== null) ? JSON.stringify(p, null, 2) : String(p || '')
            }));
            addPrompts(newPrompts); // Lưu vào lịch sử


            showToast(`Đã tạo thành công ${promptsArray.length} prompt!`, 'success');

        } catch (err: any) {
            if (err instanceof AbortError) { // Xử lý lỗi hủy
                setError('Quá trình tạo prompt đã bị người dùng dừng lại.');
                showToast('Đã dừng tạo prompt.', 'info');
            } else { // Xử lý lỗi khác
                const errorMessage = err.message || 'Lỗi không xác định.';
                setError(`Không thể tạo prompts. Lỗi: ${errorMessage}`);
                showToast('Lỗi khi tạo prompts', 'error');
            }
        } finally {
            // Reset trạng thái sau khi hoàn thành hoặc lỗi
            setIsLoading(false);
            setProgressMessage('');
            setCancellationController(null);
        }
    };

    // Hàm dừng quá trình tạo prompt
    const handleStop = () => {
        if (cancellationController) {
            cancellationController.cancel();
            setProgressMessage('Đang dừng...');
        }
    };
    
    // Hàm xử lý khi chọn file ảnh nhân vật
    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => setImagePreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    // Hàm xử lý khi nhấn nút "Phân tích ảnh"
    const handleAnalyzeImage = async () => {
        if (!imageFile) { showToast('Vui lòng chọn một hình ảnh.', 'error'); return; }
        setIsAnalyzingImage(true);
        try {
            const imagePart = await fileToGenerativePart(imageFile);
            // Gọi hàm tạo character sheet từ ảnh
            const response = await createCharacterSheetFromImage(imagePart, imageUserPrompt);
            // SỬA LỖI: Kiểm tra response text trước khi parse
            const charData = response.text ? JSON.parse(response.text) : {};
            if (charData.name && charData.description) {
                // Điền thông tin vào form
                setCharacterName(charData.name);
                setCharacterDescription(charData.description);
                showToast('Phân tích hình ảnh thành công!', 'success');
            } else {
                throw new Error("Phản hồi từ API không chứa đủ thông tin nhân vật.");
            }
        } catch (err: any) {
            showToast(`Lỗi khi phân tích ảnh: ${err.message}`, 'error');
        } finally {
            setIsAnalyzingImage(false);
        }
    };
    
    // Hàm sao chép vào clipboard
    const handleCopyToClipboard = (content: string) => {
         // SỬA LỖI: Đảm bảo content là string trước khi sao chép
        const textToCopy = (typeof content === 'object' && content !== null)
                           ? JSON.stringify(content, null, 2)
                           : String(content || '');
        navigator.clipboard.writeText(textToCopy).then(() => showToast('Đã sao chép!', 'success'), () => showToast('Lỗi khi sao chép.', 'error'));
    };


    // Các hàm xử lý cho tab Lịch sử
    const handleToggleSelectHistoryPrompt = (id: string) => setSelectedPromptIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
    const handleDeleteSelectedHistory = () => { if (selectedPromptIds.length > 0) { deletePrompts(selectedPromptIds); showToast(`Đã xóa ${selectedPromptIds.length} prompt.`, 'success'); setSelectedPromptIds([]); } };
    const handleImportHistoryToVeo = () => { 
        if (selectedPromptIds.length > 0) {
            // SỬA LỖI: Thêm || [] để tránh crash và kiểm tra p tồn tại
            const promptsToImport: AutomationPrompt[] = (prompts || [])
                .filter(p => p && selectedPromptIds.includes(p.id))
                 // SỬA LỖI: Đảm bảo p.prompt là string khi import
                .map(p => ({
                    id: `prompt-${Date.now()}-${Math.random()}`,
                    text: String(p.prompt || ''), // Đảm bảo text là string
                    status: 'idle',
                    message: 'Sẵn sàng'
                }));
            addAutomationPrompts(promptsToImport);
            showToast(`Đã import ${promptsToImport.length} prompt vào tab Tạo Video Veo3.`, 'success'); 
            setActiveView(AppView.AUTO_BROWSER);
        } 
    };
    const handleImportHistoryToImageVideo = () => {
        // SỬA LỖI: Thêm || [] để tránh crash và kiểm tra p tồn tại
        const promptsToImport: AutomationPrompt[] = (prompts || [])
            .filter(p => p && selectedPromptIds.includes(p.id))
            // SỬA LỖI: Đảm bảo p.prompt là string khi import
            .map(p => ({
                id: `prompt-${Date.now()}-${Math.random()}`,
                text: String(p.prompt || ''), // Đảm bảo text là string
                status: 'idle',
                message: 'Sẵn sàng'
            }));


        if (promptsToImport.length > 0) {
            // Sử dụng setAutomationState để cập nhật danh sách prompts trong tab CreateVideoFromImageView
            setAutomationState(prevState => ({
                ...prevState,
                // Giả sử state của tab đó cũng dùng key 'prompts'
                // SỬA LỖI: Thêm || [] để đảm bảo an toàn
                prompts: [...(prevState.prompts || []), ...promptsToImport] 
            }));
            showToast(`Đã thêm ${promptsToImport.length} prompt vào 'Tạo video từ ảnh'.`, 'success');
            setActiveView(AppView.CREATE_VIDEO_FROM_IMAGE);
        }
    };
    

    // Các hàm xử lý cho kết quả prompt vừa tạo
    const handleToggleSelectGenerated = (prompt: any) => setSelectedGeneratedPrompts(prev => prev.some(p => p === prompt) ? prev.filter(p => p !== prompt) : [...prev, prompt]);
    const handleSelectAllGenerated = (e: React.ChangeEvent<HTMLInputElement>) => setSelectedGeneratedPrompts(e.target.checked ? generatedPrompts : []);
    const handleImportGeneratedToVeo = () => {
        if (selectedGeneratedPrompts.length > 0) {
            const promptsToImport: AutomationPrompt[] = selectedGeneratedPrompts.map(p => ({
                id: `prompt-${Date.now()}-${Math.random()}`,
                 // SỬA LỖI: Đảm bảo text luôn là string
                text: (typeof p === 'object' && p !== null) ? JSON.stringify(p, null, 2) : String(p || ''),
                status: 'idle',
                message: 'Sẵn sàng'
            }));
            addAutomationPrompts(promptsToImport);
            showToast(`Đã thêm ${promptsToImport.length} prompt vào tab Tạo Video Veo3.`, 'success');
            setActiveView(AppView.AUTO_BROWSER);
        } else {
            showToast('Vui lòng chọn prompt.', 'info');
        }
    };

    
    // Các hàm xử lý cho tab Bộ sưu tập nhân vật
    const handleCharacterFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!characterName.trim() || !characterDescription.trim()) { showToast('Vui lòng nhập đủ thông tin.', 'error'); return; }
        if (editingCharacter) { // Cập nhật nhân vật
             // SỬA LỖI: Kiểm tra editingCharacter.id tồn tại
            if (editingCharacter.id) {
                updateCharacter(editingCharacter.id, { name: characterName, description: characterDescription });
                showToast('Cập nhật thành công!', 'success');
            } else {
                 showToast('Lỗi: Không tìm thấy ID nhân vật để cập nhật.', 'error');
            }
        } else { // Thêm nhân vật mới
            addCharacter({ id: `char-${Date.now()}`, name: characterName, description: characterDescription });
            showToast('Thêm thành công!', 'success');
        }
        // Reset form
        setEditingCharacter(null); setCharacterName(''); setCharacterDescription(''); setImageFile(null); setImagePreview(''); setImageUserPrompt(defaultImagePrompt);
    };
    const handleEditCharacter = (character: Character) => { setEditingCharacter(character); setCharacterName(character.name); setCharacterDescription(character.description); };
    const handleCancelEditCharacter = () => { setEditingCharacter(null); setCharacterName(''); setCharacterDescription(''); };
    
    // Hàm chọn/bỏ chọn nhân vật trong bộ sưu tập
    const handleCharacterToggle = (charId: string) => {
        setSelectedCharacterIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(charId)) {
                newSet.delete(charId);
            } else {
                newSet.add(charId);
            }
            return newSet;
        });
    };

    // --- Render Functions ---

    // Render form tạo prompt
    const renderCreateForm = () => (
        <>
            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                 {/* Phần chọn Input: Story hoặc Manual */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <div className="bg-secondary p-6 rounded-lg shadow-md h-full">
                            <div className="mb-4 flex border-b border-gray-300">
                                <button type="button" onClick={() => setActiveInputTab('select')} className={`px-4 py-2 font-medium ${activeInputTab === 'select' ? 'text-accent border-b-2 border-accent' : 'text-dark-text'}`}>Chọn câu chuyện</button>
                                <button type="button" onClick={() => setActiveInputTab('manual')} className={`px-4 py-2 font-medium ${activeInputTab === 'manual' ? 'text-accent border-b-2 border-accent' : 'text-dark-text'}`}>Nhập thủ công</button>
                            </div>
                            {activeInputTab === 'select' ? ( 
                                <>
                                    <label className="block text-dark-text font-bold mb-2">Chọn câu chuyện</label> 
                                    <select value={selectedStoryId} onChange={e => setSelectedStoryId(e.target.value)} className="w-full p-3 bg-primary rounded-md border border-gray-300 focus:ring-2 focus:ring-accent"> 
                                        <option value="">-- Chọn một câu chuyện --</option> 
                                        {/* SỬA LỖI: Thêm || [] và kiểm tra story.id */}
                                        {(stories || []).filter(story => story && story.id).map(story => (<option key={story.id} value={story.id}>{story.title || `Story ${story.id}`}</option>))}
                                    </select> 
                                </>
                            ) : ( 
                                <>
                                    <label className="block text-dark-text font-bold mb-2">💡 Nội dung câu chuyện/kịch bản</label> 
                                    <textarea value={manualStoryContent} onChange={e => setManualStoryContent(e.target.value)} placeholder="Dán nội dung câu chuyện hoặc kịch bản của bạn vào đây..." className="w-full h-32 p-3 bg-primary rounded-md border border-gray-300 focus:ring-2 focus:ring-accent" /> 
                                </>
                            )}
                        </div>
                    </div>
                     {/* Phần chọn Nhân vật */}
                    <div>
                        <div className="bg-secondary p-6 rounded-lg shadow-md h-full">
                            <label className="block text-dark-text font-bold mb-2">👤 Tái sử dụng Nhân vật</label>
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-dark-text">Tự động trích xuất & lưu nhân vật từ truyện mới</span>
                                <label htmlFor="save-character-toggle" className="flex items-center cursor-pointer">
                                    <div className="relative">
                                        <input type="checkbox" id="save-character-toggle" className="sr-only peer" checked={shouldSaveCharacter} onChange={(e) => setShouldSaveCharacter(e.target.checked)} />
                                        <div className="block bg-gray-400 w-10 h-6 rounded-full peer-checked:bg-green-500 transition"></div>
                                        <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full"></div>
                                    </div>
                                </label>
                            </div>
                            
                            <label className="block text-sm font-medium text-dark-text mb-2">Chọn nhân vật từ bộ sưu tập (đã lưu):</label>
                            <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                {/* SỬA LỖI: Thêm || [] và kiểm tra char.id */}
                                {(characters || []).length > 0 ? (characters || []).filter(char => char && char.id).map(char => (
                                    <button
                                        type="button"
                                        key={char.id}
                                        onClick={() => handleCharacterToggle(char.id)}
                                        title={char.description || ''}
                                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${selectedCharacterIds.has(char.id) ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}
                                    >
                                        {char.name || `Character ${char.id}`}
                                    </button>
                                )) : <p className="text-xs text-dark-text">Chưa có nhân vật nào. Hãy tạo ở tab "Bộ sưu tập".</p>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* === BẮT ĐẦU LƯỚI 2 CỘT MỚI CHO CÀI ĐẶT === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* CỘT 1: Thiết lập Prompt */}
                    <div className="bg-secondary p-6 rounded-lg shadow-md">
                        <label className="block text-dark-text font-bold mb-2">⚙️ Thiết lập Prompt</label>
                        <div>
                            <div className="flex flex-wrap gap-2">{settingPills.map(setting => (<button type="button" key={setting} onClick={() => handleStyleToggle(setting, 'setting')} className={`px-3 py-1.5 rounded-full text-xs font-medium ${selectedSettings.includes(setting) ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>{setting}</button>))}</div>
                            <button type="button" onClick={() => setShowCustomSettingInput(!showCustomSettingInput)} className="text-accent text-sm mt-2">{showCustomSettingInput ? '- Thu gọn' : '+ Thêm tùy chọn'}</button>
                            {showCustomSettingInput && <input type="text" value={customSetting} onChange={e => setCustomSetting(e.target.value)} placeholder="Nhập cài đặt khác, cách nhau bởi dấu phẩy (,)..." className="w-full mt-2 p-2 bg-primary rounded-md border"/>}
                        </div>
                    </div>

                    {/* CỘT 2: Phong cách & Thể loại */}
                    <div className="bg-secondary p-6 rounded-lg shadow-md">
                        <label className="block text-dark-text font-bold mb-2">🎨 Phong cách & Thể loại</label>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-dark-text mb-2">Phong cách (chọn nhiều)</label>
                                <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto">{stylePills.map(style => (<button type="button" key={style} onClick={() => handleStyleToggle(style, 'style')} className={`px-3 py-1.5 rounded-full text-xs ${selectedStyles.includes(style) ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>{style}</button>))}</div>
                                <button type="button" onClick={() => setShowCustomStyleInput(!showCustomStyleInput)} className="text-accent text-sm mt-2">{showCustomStyleInput ? '- Thu gọn' : '+ Thêm tùy chọn'}</button>
                                {showCustomStyleInput && <input type="text" value={customStyle} onChange={e => setCustomStyle(e.target.value)} placeholder="Nhập phong cách khác, cách nhau bởi dấu phẩy (,)..." className="w-full mt-2 p-2 bg-primary rounded-md border"/>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-dark-text mb-2">Thể loại (chọn một hoặc nhập tùy chỉnh)</label>
                                <div className="flex flex-wrap gap-2">{genres.map(genre => (<button type="button" key={genre} onClick={() => setSelectedGenre(genre)} className={`px-3 py-1.5 rounded-full text-xs ${selectedGenre === genre ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>{genre}</button>))}</div>
                                <button type="button" onClick={() => setShowCustomGenreInput(!showCustomGenreInput)} className="text-accent text-sm mt-2">{showCustomGenreInput ? '- Thu gọn' : '+ Thêm tùy chọn'}</button>
                                {showCustomGenreInput && <input type="text" value={customGenre} onChange={e => {setCustomGenre(e.target.value); setSelectedGenre(e.target.value);}} placeholder="Nhập thể loại khác..." className="w-full mt-2 p-2 bg-primary rounded-md border"/>}
                            </div>
                        </div>
                    </div>
                </div>
                {/* === KẾT THÚC LƯỚI 2 CỘT === */}

                {/* === BẮT ĐẦU LƯỚI 2 CỘT MỚI CHO CÀI ĐẶT CHUNG & QUAY PHIM === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* CỘT 1: Cài đặt chung */}
                    <div className="bg-secondary p-6 rounded-lg shadow-md">
                        <label className="block text-dark-text font-semibold mb-4">⚙️ Cài đặt chung</label>
                        <div className="space-y-4">
                            {/* Model */}
                            <div>
                                <label className="block text-sm font-medium text-dark-text mb-2">Model Tạo Prompt</label>
                                <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setGeminiModel('auto')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${geminiModel === 'auto' ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>Tự động</button>
                                    <button type="button" onClick={() => setGeminiModel('gemini-2.5-flash')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${geminiModel === 'gemini-2.5-flash' ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>Trung Bình</button>
                                    <button type="button" onClick={() => setGeminiModel('gemini-2.0-flash')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${geminiModel === 'gemini-2.0-flash' ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>Nhanh (Khuyên dùng)</button>
                                    <button type="button" onClick={() => setGeminiModel('gemini-2.5-flash-lite-preview-09-2025')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${geminiModel === 'gemini-2.5-flash-lite-preview-09-2025' ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>Tốc độ cao</button>
                                </div>
                            </div>
                            {/* Loại Prompt */}
                            <div>
                               <label className="block text-sm font-medium text-dark-text mb-2">Loại Prompt</label>
                               <div className="flex flex-wrap gap-2">
                                    <button type="button" onClick={() => setGranularity('detailed')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${granularity === 'detailed' ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>Nhiều Prompt (Mỗi prompt ~8s)</button>
                                    <button type="button" onClick={() => setGranularity('comprehensive')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${granularity === 'comprehensive' ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>Một Prompt (Tóm tắt)</button>
                                </div>
                            </div>
                            {/* Thời lượng video */}
                            <div>
                               <label className="block text-sm font-medium text-dark-text mb-2">Thời lượng Video (phút) - Sẽ tự tính số prompt</label>
                               <div className="flex flex-wrap gap-2 items-center">
                                    {videoDurationOptions.map(dur => <button type="button" key={dur} onClick={() => setVideoDuration(String(dur))} className={`px-3 py-1.5 rounded-full text-sm font-medium ${videoDuration === String(dur) ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>{dur} phút (~{Math.ceil(dur * 60 / 8)} prompts)</button>)}
                                    <button type="button" onClick={() => setVideoDuration('custom')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${videoDuration === 'custom' ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>Tùy chỉnh...</button>
                                    {videoDuration === 'custom' && <input type="number" value={customVideoDuration} onChange={e => setCustomVideoDuration(e.target.value)} className="w-24 p-2 bg-primary rounded-md border h-8" placeholder="phút" />}
                                </div>
                            </div>
                            {/* Ngôn ngữ giọng nói */}
                            <div>
                               <label className="block text-sm font-medium text-dark-text mb-2">Ngôn ngữ giọng nói (nếu có)</label>
                               <div className="flex flex-wrap gap-2 items-center">
                                   {voiceLanguageOptions.map(lang => <button type="button" key={lang} onClick={() => setVoiceLanguage(lang)} className={`px-3 py-1.5 rounded-full text-sm font-medium ${voiceLanguage === lang ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>{lang}</button>)}
                                   <button type="button" onClick={() => setVoiceLanguage('custom')} className={`px-3 py-1.5 rounded-full text-sm font-medium ${voiceLanguage === 'custom' ? 'bg-accent text-white' : 'bg-primary hover:bg-hover-bg'}`}>Tùy chỉnh...</button>
                                   {voiceLanguage === 'custom' && <input type="text" value={customVoiceLanguage} onChange={e => setCustomVoiceLanguage(e.target.value)} className="w-32 p-2 bg-primary rounded-md border h-8" placeholder="Ngôn ngữ"/>}
                               </div>
                            </div>
                        </div>
                    </div>

                    {/* CỘT 2: Thiết lập Quay phim */}
                    <div className="bg-secondary p-6 rounded-lg shadow-md space-y-4">
                        <label className="block text-dark-text font-bold">🎬 Thiết lập Quay phim (Tùy chọn)</label>
                        <div>
                            <label className="block text-sm font-medium text-dark-text mb-2">Ống kính (chọn nhiều)</label>
                            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                                {cameraLenses.map(lens => (<button type="button" key={lens} onClick={() => handleStyleToggle(lens, 'lens')} className={`px-3 py-1.5 rounded-full text-xs ${selectedLenses.includes(lens) ? 'bg-blue-600 text-white' : 'bg-primary hover:bg-hover-bg'}`}>{lens}</button>))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-dark-text mb-2">Góc máy & Chuyển động (chọn nhiều)</label>
                            <div className="flex flex-wrap gap-2 max-h-80 overflow-y-auto">
                                {cameraShots.map(shot => (<button type="button" key={shot} onClick={() => handleStyleToggle(shot, 'shot')} className={`px-3 py-1.5 rounded-full text-xs ${selectedCameraShots.includes(shot) ? 'bg-blue-600 text-white' : 'bg-primary hover:bg-hover-bg'}`}>{shot}</button>))}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-dark-text mb-2">Ánh sáng (chọn nhiều)</label>
                            <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
                                {lightingSetups.map(light => (<button type="button" key={light} onClick={() => handleStyleToggle(light, 'lighting')} className={`px-3 py-1.5 rounded-full text-xs ${selectedLightings.includes(light) ? 'bg-blue-600 text-white' : 'bg-primary hover:bg-hover-bg'}`}>{light}</button>))}
                            </div>
                        </div>
                    </div>
                </div>
                {/* === KẾT THÚC LƯỚI 2 CỘT === */}


                {/* Phần Output JSON (Full width) */}
                <div className="bg-secondary p-6 rounded-lg shadow-md flex items-center justify-between">
                     <label className="block text-dark-text font-bold">Tạo prompt dưới dạng JSON (chi tiết hơn, thử nghiệm)</label>
                     <label htmlFor="json-output-toggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input type="checkbox" id="json-output-toggle" className="sr-only peer" checked={isJsonOutput} onChange={(e) => setIsJsonOutput(e.target.checked)} />
                            <div className="block bg-gray-400 w-10 h-6 rounded-full peer-checked:bg-green-500 transition"></div>
                            <div className="dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition peer-checked:translate-x-full"></div>
                        </div>
                    </label>
                </div>

                {/* Nút Tạo và Dừng (Full width) */}
                <div className="md:col-span-2">
                    <div className="flex flex-col items-center">
                        <div className="w-full flex gap-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center items-center bg-accent hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:bg-gray-400"
                            >
                                {isLoading ? <Spinner /> : null}
                                <span className="ml-2">{isLoading ? 'Đang tạo...' : 'Tạo Prompts'}</span>
                            </button>
                            {isLoading && ( // Chỉ hiển thị nút Dừng khi đang tạo
                                <button
                                    type="button"
                                    onClick={handleStop}
                                    className="flex justify-center items-center bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
                                >
                                    Dừng
                                </button>
                            )}
                        </div>
                        {/* Hiển thị thông báo tiến trình */}
                        {isLoading && progressMessage && (
                            <p className="text-accent text-center mt-2 animate-pulse">{progressMessage}</p>
                        )}
                    </div>
                </div>
            </form>

            {/* Hiển thị lỗi */}
            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

            {/* Hiển thị kết quả */}
            {generatedPrompts.length > 0 && (
                <div className="mt-8">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold text-light">Kết quả ({generatedPrompts.length} prompts)</h2>
                        {/* Toolbar cho kết quả */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center"><input type="checkbox" id="select-all-generated" className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" onChange={handleSelectAllGenerated} checked={selectedGeneratedPrompts.length > 0 && selectedGeneratedPrompts.length === generatedPrompts.length} /><label htmlFor="select-all-generated" className="ml-2 text-sm font-medium">Chọn tất cả</label></div>
                            <button onClick={handleImportGeneratedToVeo} disabled={selectedGeneratedPrompts.length === 0} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:bg-gray-400 text-sm">Thêm vào Tạo Video ({selectedGeneratedPrompts.length})</button>
                        </div>
                    </div>
                    {/* Danh sách kết quả */}
                    <div className="space-y-2 max-h-96 overflow-y-auto bg-secondary p-4 rounded-lg">
                        {generatedPrompts.map((prompt, index) => (
                            <div key={index} className="flex items-center gap-3 p-2 rounded-md hover:bg-primary">
                                <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent" checked={selectedGeneratedPrompts.includes(prompt)} onChange={() => handleToggleSelectGenerated(prompt)} />
                                <div className="text-sm flex-1">
                                    {isJsonOutput ? <pre className="whitespace-pre-wrap text-xs"><code>{JSON.stringify(prompt, null, 2)}</code></pre> : <p>{String(prompt || '')}</p>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </>
    );

    // Render tab lịch sử
    const renderHistory = () => (
        <div>
            {/* Toolbar lọc và hành động hàng loạt */}
            <div className="bg-secondary p-4 rounded-lg shadow-md mb-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-dark-text font-bold mb-1 text-sm">Lọc theo câu chuyện</label>
                    <select value={historyFilterStoryId} onChange={e => setHistoryFilterStoryId(e.target.value)} className="w-full p-2 bg-primary rounded-md border border-border-color">
                        {/* *** CẬP NHẬT: Thay đổi văn bản mặc định *** */}
                        <option value="">-- Vui lòng chọn một câu chuyện --</option>
                        {/* SỬA LỖI: Thêm || [] và kiểm tra option.id */}
                        {(historyFilterOptions || []).filter(option => option && option.id).map(option => (
                            <option key={option.id} value={option.id}>{option.title || `Story ${option.id}`}</option>
                        ))}
                    </select>
                </div>
                {/* Chỉ hiển thị phần Chọn tất cả và nút khi đã chọn story */}
                {historyFilterStoryId && (
                    <>
                        <div className="flex items-center gap-2 pt-5">
                             {/* SỬA LỖI: Kiểm tra filteredHistoryPrompts trước khi truy cập length */}
                            <input type="checkbox" id="select-all-history" className="form-checkbox h-5 w-5 text-accent rounded border-gray-300 focus:ring-accent" checked={areAllHistoryPromptsSelected} onChange={handleSelectAllHistoryToggle} disabled={!filteredHistoryPrompts || filteredHistoryPrompts.length === 0} />
                            <label htmlFor="select-all-history" className="text-sm font-medium text-dark-text cursor-pointer">Chọn tất cả ({filteredHistoryPrompts?.length || 0})</label>
                        </div>
                        {selectedPromptIds.length > 0 && (
                            <div className="flex items-end gap-2 ml-auto pt-5">
                                <button onClick={handleImportHistoryToVeo} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Import vào Veo ({selectedPromptIds.length})</button>
                                <button onClick={handleDeleteSelectedHistory} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg text-sm">Xóa ({selectedPromptIds.length})</button>
                            </div>
                        )}
                    </>
                )}
            </div>
            
            {/* *** CẬP NHẬT: Logic hiển thị danh sách prompt *** */}
            <div className="space-y-3">
                {!historyFilterStoryId ? (
                    // 1. Trạng thái mặc định (chưa chọn story)
                    <p className="text-dark-text text-center py-8">Vui lòng chọn một câu chuyện để xem lịch sử prompt.</p>
                ) : !filteredHistoryPrompts || filteredHistoryPrompts.length === 0 ? (
                    // 2. Trạng thái đã chọn story nhưng không có prompt (hoặc đang tải/lỗi)
                    <p className="text-dark-text text-center py-8">Không có prompt nào được tìm thấy cho câu chuyện này.</p>
                ) : (
                    // 3. Trạng thái đã chọn story và có prompt
                    filteredHistoryPrompts.map(prompt => {
                        // SỬA LỖI: Thêm kiểm tra an toàn cho prompt và các thuộc tính của nó
                        if (!prompt || !prompt.id) {
                            console.warn("Skipping rendering invalid history prompt:", prompt);
                            return null; // Bỏ qua prompt không hợp lệ
                        }
                        const promptText = String(prompt.prompt || ''); // Đảm bảo là string
                        const storyTitle = prompt.storyTitle || 'Không rõ nguồn';

                        return (
                            <div key={prompt.id} className={`p-3 rounded-lg shadow flex items-center gap-4 transition-colors ${selectedPromptIds.includes(prompt.id) ? 'bg-accent/10' : 'bg-secondary'}`}>
                                <input type="checkbox" className="form-checkbox h-5 w-5 text-accent rounded border-gray-300 focus:ring-accent flex-shrink-0" checked={selectedPromptIds.includes(prompt.id)} onChange={() => handleToggleSelectHistoryPrompt(prompt.id)} />
                                <div className="flex-1 cursor-pointer overflow-hidden" onClick={() => handleToggleSelectHistoryPrompt(prompt.id)}>
                                    <p className="text-sm line-clamp-2">{promptText}</p>
                                    <p className="text-xs mt-1 opacity-75 truncate">Từ: {storyTitle}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => handleCopyToClipboard(promptText)} title="Sao chép" className="p-2 rounded-md hover:bg-gray-200"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-dark-text" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg></button>
                                    <button onClick={() => deletePrompt(prompt.id)} title="Xóa" className="p-2 rounded-md hover:bg-red-100"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );

    
    // Render tab bộ sưu tập nhân vật
    const renderCharacterCollection = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Form thêm/sửa nhân vật */}
            <div>
                <form onSubmit={handleCharacterFormSubmit} className="bg-secondary p-6 rounded-lg shadow-md space-y-4">
                    <h3 className="text-xl font-bold text-light">{editingCharacter ? 'Chỉnh sửa nhân vật' : 'Thêm nhân vật mới (thủ công)'}</h3>
                    <div><label className="block text-dark-text font-bold mb-2">Tên nhân vật</label><input type="text" value={characterName} onChange={e => setCharacterName(e.target.value)} placeholder="Ví dụ: Bò Vàng" className="w-full p-2 bg-primary rounded-md border border-border-color" /></div>
                    <div><label className="block text-dark-text font-bold mb-2">Mô tả (Character Sheet)</label><textarea value={characterDescription} onChange={e => setCharacterDescription(e.target.value)} placeholder="Mô tả chi tiết ngoại hình, tính cách, quần áo..." className="w-full h-40 p-2 bg-primary rounded-md border border-border-color" /></div>
                    <div className="flex gap-4"><button type="submit" className="flex-1 bg-accent hover:bg-indigo-500 text-white font-bold py-2 rounded-lg">{editingCharacter ? 'Lưu thay đổi' : 'Thêm vào bộ sưu tập'}</button>{editingCharacter && <button type="button" onClick={handleCancelEditCharacter} className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg">Hủy</button>}</div>
                </form>
                {/* Phần tạo nhân vật từ ảnh */}
                <div className="bg-secondary p-6 rounded-lg shadow-md space-y-4 mt-6">
                    <h3 className="text-xl font-bold text-light">Tạo nhân vật từ ảnh</h3>
                    <p className="text-sm text-dark-text">Tải lên một hình ảnh để AI tự động tạo mô tả nhân vật cho bạn.</p>
                    <input type="file" accept="image/*" onChange={handleImageFileChange} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent/20 file:text-accent hover:file:bg-accent/30"/>
                    {imagePreview && (
                        <div className="mt-4">
                            <img src={imagePreview} alt="Xem trước nhân vật" className="max-w-xs h-auto rounded-lg mx-auto"/>
                            <label className="block text-dark-text font-bold mb-2 mt-4">Yêu cầu phân tích ảnh (tùy chỉnh)</label>
                            <textarea value={imageUserPrompt} onChange={e => setImageUserPrompt(e.target.value)} placeholder={defaultImagePrompt} className="w-full h-24 p-2 mt-1 bg-primary rounded-md border border-border-color"/>
                            <button type="button" onClick={handleAnalyzeImage} disabled={isAnalyzingImage} className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded-lg flex items-center justify-center disabled:bg-gray-400">
                                {isAnalyzingImage && <Spinner className="w-4 h-4 mr-2"/>}
                                {isAnalyzingImage ? 'Đang phân tích...' : 'Phân tích & điền vào form'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Danh sách nhân vật đã lưu */}
            <div className="bg-secondary p-4 rounded-lg shadow-inner">
                <h3 className="text-xl font-bold text-light mb-4">Danh sách nhân vật</h3>
                <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-2">
                    {/* SỬA LỖI: Thêm || [] và kiểm tra char.id */}
                    {(characters || []).length === 0 ? <p className="text-dark-text text-center py-8">Chưa có nhân vật nào được lưu.</p> : (characters || []).filter(char => char && char.id).map(char => (
                        <div key={char.id} className="bg-primary p-3 rounded-md">
                            <div className="flex justify-between items-start">
                                <div>
                                     <h4 className="font-bold text-light">{char.name || `Character ${char.id}`}</h4>
                                     <p className="text-sm text-dark-text mt-1 line-clamp-3">{char.description || ''}</p>
                                </div>
                                <div className="flex gap-2 flex-shrink-0">
                                    <button onClick={() => handleEditCharacter(char)} title="Sửa" className="p-1.5 hover:bg-gray-200 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-dark-text" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L14.732 3.732z" /></svg>
                                    </button>
                                    <button onClick={() => deleteCharacter(char.id)} title="Xóa" className="p-1.5 hover:bg-red-100 rounded-md">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );

    // Render nội dung chính dựa trên tab đang chọn
    const renderMainContent = () => {
        switch (mainTab) {
            case 'create': return renderCreateForm();
            case 'history': return renderHistory();
            case 'collection': return renderCharacterCollection();
            default: return null;
        }
    };

    // Render component chính
    return (
        <div className="animate-fade-in">
            {/* Tiêu đề và mô tả */}
            <h1 className="text-3xl font-bold text-light mb-2">Tạo Prompt Video</h1>
            <p className="text-dark-text mb-6">Tạo prompt từ câu chuyện, quản lý bộ sưu tập nhân vật và lịch sử prompt của bạn.</p>
            {/* Thanh điều hướng tab chính */}
            <div className="mb-6"><div className="border-b border-gray-200"><nav className="-mb-px flex space-x-6">
                <button onClick={() => setMainTab('create')} className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${mainTab === 'create' ? 'border-accent text-accent' : 'border-transparent text-dark-text hover:text-light hover:border-gray-300'}`}>Tạo Mới</button>
                {/* SỬA LỖI: Thêm || [] để tránh crash */}
                <button onClick={() => setMainTab('history')} className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${mainTab === 'history' ? 'border-accent text-accent' : 'border-transparent text-dark-text hover:text-light hover:border-gray-300'}`}>Lịch sử ({(prompts || []).length})</button>
                <button onClick={() => setMainTab('collection')} className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${mainTab === 'collection' ? 'border-accent text-accent' : 'border-transparent text-dark-text hover:text-light hover:border-gray-300'}`}>Bộ sưu tập nhân vật ({(characters || []).length})</button>
            </nav></div></div>
            {/* Hiển thị nội dung tab đang chọn */}
            {renderMainContent()}
        </div>
    );
};

export default CreatePromptsView;