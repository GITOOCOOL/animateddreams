import { DreamAnalysis } from '../types';

export interface SavedDream {
    id: string;
    rawText: string;
    visualPrompt: string;
    analysis: DreamAnalysis;
    createdAt: number;
    media: { filePath: string; type: 'image' | 'video' }[];
}

const DB_API = '/api/db';

/**
 * Save a generated dream to the local database and file system.
 */
export const saveDreamToDatabase = async (
    dream: {
        id: string;
        rawText: string;
        analysis: DreamAnalysis;
        generatedImageUrl?: string | null;
        generatedVideoUrl?: string | null;
    }
) => {
    try {
        const payload: any = {
            id: dream.id,
            rawText: dream.rawText,
            visualPrompt: dream.analysis.visualPrompt,
            analysis: dream.analysis,
            media: null
        };

        // Determine primary media to save
        if (dream.generatedImageUrl) {
            payload.media = { url: dream.generatedImageUrl, type: 'image' };
        } else if (dream.generatedVideoUrl) {
            payload.media = { url: dream.generatedVideoUrl, type: 'video' };
        }

        const response = await fetch(`${DB_API}/dreams`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to save to DB');
        console.log("Dream Saved Successfully");
        return await response.json();

    } catch (error) {
        console.error("Storage Error:", error);
        throw error;
    }
};

/**
 * Fetch all saved dreams.
 */
export const getSavedDreams = async (): Promise<SavedDream[]> => {
    try {
        const response = await fetch(`${DB_API}/dreams`);
        if (!response.ok) throw new Error('Failed to fetch history');
        return await response.json();
    } catch (error) {
        console.error("Fetch History Error:", error);
        return [];
    }
};
