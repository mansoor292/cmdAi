export class JSONUtils {
    /**
     * Extracts and validates JSON from a text string.
     * Returns the parsed JSON object if valid, null otherwise.
     * 
     * @param {string} text - The text containing JSON
     * @returns {object|null} Parsed JSON object or null if invalid
     */
    static extractJSON(text) {
        if (!text) return null;

        try {
            // First try parsing the text directly
            const parsed = JSON.parse(text);
            if (parsed?.project?.rootDirectory?.contents) {
                return parsed;
            }
        } catch (error) {
            // If direct parsing fails, try to find and extract JSON
            const startIndex = text.indexOf('{');
            const endIndex = text.lastIndexOf('}');

            if (startIndex === -1 || endIndex === -1) {
                return null;
            }

            try {
                const jsonText = text.slice(startIndex, endIndex + 1);
                const parsed = JSON.parse(jsonText);
                if (parsed?.project?.rootDirectory?.contents) {
                    return parsed;
                }
            } catch (e) {
                return null;
            }
        }

        return null;
    }

    /**
     * Safely stringifies a JSON object with proper formatting
     * 
     * @param {object} obj - The object to stringify
     * @returns {string} Formatted JSON string
     */
    static stringify(obj) {
        try {
            return JSON.stringify(obj, null, 2);
        } catch (error) {
            return null;
        }
    }
}
