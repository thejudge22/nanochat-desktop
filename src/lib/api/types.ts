export type Role = "user" | "assistant" | "system";
export type WebSearchMode = "off" | "standard" | "deep";
export type WebSearchProvider = "linkup" | "tavily" | "exa" | "kagi";
export type ReasoningEffort = "low" | "medium" | "high";
export type FileType = "pdf" | "markdown" | "text" | "epub";
export type ProjectRole = "owner" | "editor" | "viewer";
export type MessageAction = "regenerate" | "edit" | "copy" | "share";
export type ThumbsRating = "up" | "down";

export interface ImageAttachment {
    url: string;
    storage_id: string;
    fileName?: string;
}

export interface DocumentAttachment {
    url: string;
    storage_id: string;
    fileName?: string;
    fileType: FileType;
}

export interface GenerateMessageRequest {
    message?: string;
    model_id: string;
    assistant_id?: string;
    project_id?: string;
    session_token?: string;
    conversation_id?: string;
    web_search_enabled?: boolean;
    web_search_mode?: WebSearchMode;
    web_search_provider?: WebSearchProvider;
    images?: ImageAttachment[];
    documents?: DocumentAttachment[];
    reasoning_effort?: ReasoningEffort;
    temporary?: boolean;
    provider_id?: string;
}

export interface GenerateMessageResponse {
    ok: boolean;
    conversation_id: string;
}

export interface Conversation {
    id: string;
    title: string;
    userId: string;
    projectId: string | null;
    pinned: boolean;
    generating: boolean;
    costUsd: number | null;
    createdAt: string;
    updatedAt: string;
}

export interface Message {
    id: string;
    conversationId: string;
    role: Role;
    content: string;
    contentHtml: string | null;
    modelId: string | null;
    reasoning: string | null;
    images: ImageAttachment[] | null;
    documents: DocumentAttachment[] | null;
    createdAt: string;
}

export interface UserModel {
    modelId: string;
    provider: string;
    enabled: boolean;
    pinned: boolean;
}

export interface ModelProvider {
    canonicalId: string;
    displayName: string;
    supportsProviderSelection: boolean;
    providers: string[];
}

export interface Assistant {
    readonly id: string;
    readonly name: string;
    readonly description: string | null;
    readonly systemPrompt: string;
    readonly isDefault: boolean;
    readonly defaultModelId: string | null;
    readonly defaultWebSearchMode: WebSearchMode | null;
    readonly defaultWebSearchProvider: WebSearchProvider | null;
    readonly createdAt: string;
    readonly updatedAt: string;
}

export interface Project {
    id: string;
    name: string;
    description: string | null;
    systemPrompt: string | null;
    color: string | null;
    role: ProjectRole;
    isShared: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ProjectFile {
    id: string;
    projectId: string;
    storageId: string;
    fileName: string;
    fileType: FileType;
    extractedContent: string | null;
    createdAt: string;
    storage?: StorageItem;
}

export interface ProjectMember {
    id: string;
    projectId: string;
    userId: string;
    role: ProjectRole;
    user: {
        id: string;
        name: string;
        email: string;
        image: string | null;
    };
}

export interface StorageItem {
    id: string;
    url: string;
}

export interface StorageUploadResponse {
    storageId: string;
    url: string;
}

export interface UserSettings {
    userId: string;
    privacyMode: boolean;
    contextMemoryEnabled: boolean;
    persistentMemoryEnabled: boolean;
    theme: string | null;
}

export interface UserRule {
    id: string;
    name: string;
    attach: boolean;
    rule: string;
    createdAt: string;
    updatedAt: string;
}

export interface ApiKey {
    id: string;
    name: string;
    lastUsedAt: string | null;
    createdAt: string;
}

export interface ApiKeyCreateResponse {
    id: string;
    key: string;
    name: string;
    createdAt: string;
}

export interface MessageInteraction {
    id: string;
    messageId: string;
    userId: string;
    action: MessageAction;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}

export interface MessageRating {
    id: string;
    messageId: string;
    userId: string;
    thumbs: ThumbsRating | null;
    rating: number | null;
    categories: string[] | null;
    feedback: string | null;
    createdAt: string;
}

export interface NanoGptBalance {
    balance: number;
    currency: string;
}

export interface FollowUpQuestionsResponse {
    ok: boolean;
    suggestions: string[];
}

export interface EnhancePromptResponse {
    ok: boolean;
    enhanced_prompt: string;
}

export interface ApiError {
    message: string;
    status: number;
}

