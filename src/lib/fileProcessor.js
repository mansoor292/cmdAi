import fs from 'fs/promises';
import path from 'path';
import { JSONUtils } from './jsonUtils.js';

export class FileProcessor {
    /**
     * Processes a JSON structure and creates corresponding files and directories
     * @param {Object} structure - The JSON structure defining files and directories
     * @param {string} basePath - The base path where to create the structure
     * @param {Array<string>} specificFiles - Optional array of specific files to process
     */
    static async processStructure(structure, basePath, specificFiles = null) {
        if (!structure.project || !structure.project.rootDirectory) {
            throw new Error('Invalid project structure. Must contain project and rootDirectory.');
        }

        const rootDir = structure.project.rootDirectory;
        const projectPath = path.join(basePath, rootDir.name);

        // Create the root directory
        await fs.mkdir(projectPath, { recursive: true });

        // Process the contents
        await this.processContents(rootDir.contents, projectPath, specificFiles);
    }

    /**
     * Gets all file paths from the structure
     * @param {Object} contents - The contents object
     * @param {string} basePath - The current path (used for recursion)
     * @returns {Array<string>} - Array of all file paths
     */
    static getAllFilePaths(contents, basePath = '') {
        const paths = [];

        if (contents.files && Array.isArray(contents.files)) {
            for (const file of contents.files) {
                paths.push(basePath ? `${basePath}/${file.name}` : file.name);
            }
        }

        if (contents.directories && Array.isArray(contents.directories)) {
            for (const dir of contents.directories) {
                const dirPath = basePath ? `${basePath}/${dir.name}` : dir.name;
                if (dir.contents) {
                    paths.push(...this.getAllFilePaths(dir.contents, dirPath));
                }
            }
        }

        return paths;
    }

    /**
     * Creates a subset of the project structure containing only specified files
     * @param {Object} structure - The full project structure
     * @param {Array<string>} filePaths - Array of file paths to include
     * @returns {Object} - A new structure containing only the specified files
     */
    static createSubsetStructure(structure, filePaths) {
        const subset = {
            project: {
                rootDirectory: {
                    name: structure.project.rootDirectory.name,
                    contents: { files: [], directories: [] }
                }
            }
        };

        for (const filePath of filePaths) {
            const parts = filePath.split('/');
            let currentLevel = subset.project.rootDirectory.contents;
            let originalLevel = structure.project.rootDirectory.contents;
            
            // Process all directories in the path except the last part (which is the file)
            for (let i = 0; i < parts.length - 1; i++) {
                const dirName = parts[i];
                let dirEntry = currentLevel.directories.find(d => d.name === dirName);
                
                if (!dirEntry) {
                    dirEntry = { name: dirName, contents: { files: [], directories: [] } };
                    currentLevel.directories.push(dirEntry);
                }

                currentLevel = dirEntry.contents;
                originalLevel = originalLevel.directories.find(d => d.name === dirName)?.contents || {};
            }

            // Add the file
            const fileName = parts[parts.length - 1];
            const originalFile = originalLevel.files?.find(f => f.name === fileName);
            if (originalFile) {
                currentLevel.files.push({ ...originalFile });
            }
        }

        return subset;
    }

    /**
     * Ensures a directory exists
     * @param {string} dirPath - Path to the directory
     */
    static async ensureDirectoryExists(dirPath) {
        try {
            await fs.access(dirPath);
        } catch {
            await fs.mkdir(dirPath, { recursive: true });
        }
    }

    /**
     * Ensures a file exists
     * @param {string} filePath - Path to the file
     */
    static async ensureFileExists(filePath) {
        try {
            await fs.access(filePath);
        } catch {
            // Create the directory if it doesn't exist
            await this.ensureDirectoryExists(path.dirname(filePath));
            // Create an empty file
            await fs.writeFile(filePath, '');
        }
    }

    /**
     * Recursively processes contents of a directory
     * @param {Object} contents - The contents object containing files and directories
     * @param {string} currentPath - The current directory path
     * @param {Array<string>} specificFiles - Optional array of specific files to process
     */
    static async processContents(contents, currentPath, specificFiles = null) {
        if (!contents) return;

        // First ensure the current directory exists
        await this.ensureDirectoryExists(currentPath);

        // Process files
        if (contents.files && Array.isArray(contents.files)) {
            for (const file of contents.files) {
                if (file.name && file.contents !== undefined) {
                    const filePath = path.join(currentPath, file.name);
                    const relativePath = path.relative(process.cwd(), filePath);
                    
                    // Skip if specificFiles is provided and this file is not in the list
                    if (specificFiles && !specificFiles.includes(relativePath)) {
                        continue;
                    }

                    // Ensure the file exists before writing
                    await this.ensureFileExists(filePath);

                    // Convert contents to string if it's not already
                    const fileContents = typeof file.contents === 'string' 
                        ? file.contents 
                        : JSON.stringify(file.contents, null, 2);
                    await fs.writeFile(filePath, fileContents);
                }
            }
        }

        // Process directories recursively
        if (contents.directories && Array.isArray(contents.directories)) {
            for (const dir of contents.directories) {
                if (dir.name) {
                    const dirPath = path.join(currentPath, dir.name);
                    await this.ensureDirectoryExists(dirPath);
                    
                    // Process contents of this directory
                    if (dir.contents) {
                        await this.processContents(dir.contents, dirPath, specificFiles);
                    }
                }
            }
        }
    }

    /**
     * Validates and processes JSON content into file structure
     * @param {string} content - The JSON content to process
     * @param {string} outputPath - The base path where to create the structure
     * @param {Array<string>} specificFiles - Optional array of specific files to process
     */
    static async processJSONContent(content, outputPath, specificFiles = null) {
        try {
            let structure;

            // First try to parse the content directly as JSON
            try {
                structure = JSON.parse(content);
            } catch (e) {
                // If direct parsing fails, try to extract JSON using JSONUtils
                structure = JSONUtils.extractJSON(content);
            }

            if (!structure) {
                throw new Error('No valid project structure JSON found in content');
            }

            // Ensure the output path exists
            await this.ensureDirectoryExists(outputPath);

            // Process the structure
            await this.processStructure(structure, outputPath, specificFiles);
            
            return true;
        } catch (error) {
            throw new Error(`Failed to process JSON content: ${error.message}`);
        }
    }

    /**
     * Process structure in chunks and return subset structures
     * @param {Object} structure - The project structure
     * @param {number} chunkSize - Size of each chunk
     * @returns {Array<Object>} Array of subset structures
     */
    static getStructureChunks(structure, chunkSize = 3) {
        const chunks = [];
        const rootDir = structure.project.rootDirectory;
        const allPaths = this.getAllFilePaths(rootDir.contents);

        // Process in chunks
        for (let i = 0; i < allPaths.length; i += chunkSize) {
            const chunkPaths = allPaths.slice(i, i + chunkSize);
            const subset = this.createSubsetStructure(structure, chunkPaths);
            chunks.push(subset);
        }

        return chunks;
    }
}
