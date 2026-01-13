import { apiRequest } from "./client";
import type { Assistant } from "./types";

export async function listAssistants(): Promise<Assistant[]> {
    return apiRequest<Assistant[]>("/api/assistants");
}
