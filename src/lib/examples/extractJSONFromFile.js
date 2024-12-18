import { JSONUtils } from '../jsonUtils.js';
import fs from 'fs/promises';

async function extractJSONFromFile(filePath) {
    try {
        // Read the entire file content
        const content = await fs.readFile(filePath, 'utf8');
        
        // Extract JSON using our utility
        const json = JSONUtils.extractJSON(content);
        
        if (json) {
            // If JSON was found, print it nicely formatted with proper indentation
            const formatted = JSON.stringify(json, null, 2)
                .split('\n')
                .map(line => `  ${line}`) // Add extra indentation for readability
                .join('\n');
            console.log('\nExtracted JSON:');
            console.log('----------------------------------------');
            console.log(formatted);
            console.log('----------------------------------------');
        } else {
            console.error('\n❌ No valid JSON found in file');
        }
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error(`\n❌ File not found: ${filePath}`);
        } else {
            console.error('\n❌ Error processing file:', error.message);
        }
        process.exit(1);
    }
}

// Get file path from command line argument or use default
const filePath = process.argv[2] || 'test.txt';
extractJSONFromFile(filePath);
