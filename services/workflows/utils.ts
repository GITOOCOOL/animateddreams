
/**
 * Helper to get safe node input from a workflow dictionary.
 * Ensures the inputs object exists.
 */
export const getInput = (workflow: any, nodeId: string) => {
    if (!workflow[nodeId]) return null;
    if (!workflow[nodeId].inputs) workflow[nodeId].inputs = {};
    return workflow[nodeId].inputs;
};
