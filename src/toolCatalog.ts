export type ToolCategory = 'local' | 'web';
export type PlatformId = 'macos' | 'windows-portable' | 'web';
export type Locale = 'en' | 'zh-TW';

export type LocalizedText = Record<Locale, string>;

export type ToolDefinition = {
  id: string;
  name: LocalizedText;
  category: ToolCategory;
  summary: LocalizedText;
  description: LocalizedText;
  operationNotes: Record<Locale, string[]>;
  webAppUrl?: string;
  githubRepo?: string;
  platforms: PlatformId[];
};

export const tools: ToolDefinition[] = [
  {
    id: 'spine-atlas-duplicator',
    name: {
      en: 'Spine Atlas Duplicator',
      'zh-TW': 'Spine Atlas 複製器',
    },
    category: 'local',
    summary: {
      en: 'Duplicate Spine .atlas for skeletons.',
      'zh-TW': 'Spine 跨骨架合圖時，複製 .atlas 給其他骨架用。',
    },
    description: {
      en: 'A local desktop tool for artists and technical artists who need a fast, repeatable way to duplicate Spine atlas files without manually editing every related asset.',
      'zh-TW': '會自動搜索資料夾內的 Spine 骨架檔案，複製出對應的 .atlas',
    },
    operationNotes: {
      en: [
        'Select the source Spine atlas package.',
        'Choose the duplicate naming target.',
        'Review the generated output before replacing production files.',
      ],
      'zh-TW': [
        '丟入來源 .atlas 檔案。',
        '檢查檔案預覽列表，勾選需複製的檔案。',
        '替換正式檔案前先檢查輸出結果。',
      ],
    },
    githubRepo: 'januswow/SpineAtlasDuplicator',
    platforms: ['macos', 'windows-portable'],
  },
  {
    id: 'file-sync-tool',
    name: {
      en: 'File Sync Tool',
      'zh-TW': '檔案同步工具',
    },
    category: 'local',
    summary: {
      en: 'Sync project files between working folders with a focused desktop workflow.',
      'zh-TW': '將來源資料夾中的檔案，同步到目標資料夾中',
    },
    description: {
      en: 'A local file sync utility for team workflows where source and destination folders need to stay aligned without a heavy project management system.',
      'zh-TW': '依來源資料夾內的檔案，找到目標資料夾內的同名檔案。可以比對檔案間的差異，尤其支援Spine合圖、Spine骨架檔的比對。',
    },
    operationNotes: {
      en: [
        'Pick the source and destination folders.',
        'Run a preview to confirm the sync scope.',
        'Apply sync after reviewing changed files.',
      ],
      'zh-TW': [
        '選擇來源與目標資料夾（可以設置過濾器，排除不需要的檔案）。',
        '執行搜索配對，預覽檔案狀況、比對內容。',
        '勾選需要同步的檔案後再執行同步。',
      ],
    },
    githubRepo: 'januswow/FileSyncTool',
    platforms: ['macos', 'windows-portable'],
  },
  {
    id: 'spine-downgrade-tool',
    name: {
      en: 'Spine Downgrade Tool',
      'zh-TW': 'Spine 輸出資源降版工具',
    },
    category: 'local',
    summary: {
      en: 'Downgrade Spine project files for compatibility with older runtime targets.',
      'zh-TW': '將 Spine v4.2 的輸出資源，降版到 v3.8。',
    },
    description: {
      en: 'A desktop downgrade workflow for Spine files when a project needs to move assets into a version expected by downstream runtime or build tooling.',
      'zh-TW': `支援 json/skel，可以解決動畫曲線遺失、屬性分離遺失（RGB/A、X/Y）...等問題，但仍有部分不支援（物理）或無法正確還原（約束的X/Y分離）。
      可以直覺的比對前/後版本結果。
      支援批量轉換。`,
    },
    operationNotes: {
      en: [
        'Choose the Spine files or folder to process.',
        'Select the downgrade target supported by the tool.',
        'Check the generated report before committing converted files.',
      ],
      'zh-TW': [
        '選擇要處理的 Spine 檔案或資料夾。',
        '按下轉換按鈕，等待轉換完成（若檔案複雜會需要較長的時間）。',
        '檢查轉換結果（若有丟入合圖圖檔，可以預覽動畫）。',
      ],
    },
    webAppUrl: 'https://spine-downgrade-tool.netlify.app/',
    githubRepo: 'januswow/SpineDowngradeTool',
    platforms: ['macos', 'windows-portable', 'web'],
  },
  {
    id: 'spine-downgrade-web',
    name: {
      en: 'Spine Downgrade Web App',
      'zh-TW': 'Spine 輸出資源降版工具（Web版）',
    },
    category: 'web',
    summary: {
      en: 'Run the Spine downgrade workflow in a browser when local install is not needed.',
      'zh-TW': '將 Spine v4.2 的輸出資源，降版到 v3.8。不支援 skel、批量轉換',
    },
    description: {
      en: 'The hosted web version of Spine Downgrade Tool for quick conversions and review without downloading the desktop app.',
      'zh-TW': `支援 json，可以解決動畫曲線遺失、屬性分離遺失（RGB/A、X/Y）...等問題，但仍有部分不支援（物理）或無法正確還原（約束的X/Y分離）。
      可以直覺的比對前/後版本結果。`,
    },
    operationNotes: {
      en: [
        'Open the hosted app.',
        'Upload or select the Spine content supported by the web workflow.',
        'Download the converted result and verify it in the target pipeline.',
      ],
      'zh-TW': [
        '選擇要處理的 Spine 檔案。',
        '按下轉換按鈕，等待轉換完成（若檔案複雜會需要較長的時間）。',
        '檢查轉換結果（若有丟入合圖圖檔，可以預覽動畫）。',
      ],
    },
    webAppUrl: 'https://spine-downgrade-tool.netlify.app/',
    githubRepo: 'januswow/SpineDowngradeTool',
    platforms: ['web'],
  },
  {
    id: 'spine-atlas-tool',
    name: {
      en: 'Spine Atlas Tool',
      'zh-TW': 'Spine Atlas Tool',
    },
    category: 'web',
    summary: {
      en: 'Open the hosted Spine atlas workflow for browser-based atlas tasks.',
      'zh-TW': `直覺檢視圖塊內容、優化指定圖塊的尺寸。`,
    },
    description: {
      en: 'A browser-based Spine atlas utility for team members who need quick access without installing a local desktop build.',
      'zh-TW': `直覺的檢視 Atlas 圖塊內容。
      可以調整指定圖塊的縮放比例並輸出新合圖，優化合圖的尺寸容量。
      也可以將指定圖塊內容另存成圖片。
      有工具設定檔供重複編輯。`,
    },
    operationNotes: {
      en: [
        'Open the hosted tool.',
        'Prepare the atlas files required by the workflow.',
        'Download or copy the generated result back into the project.',
      ],
      'zh-TW': [
        '丟入合圖資源（.atlas + .png/.jpg）。',
        '檢視圖塊，設定哪些圖塊要縮小。',
        '下載新合圖資源。',
      ],
    },
    webAppUrl: 'https://spine-atlas-tool.netlify.app/',
    platforms: ['web'],
  },
];
