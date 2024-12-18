import path from 'path';
import { JSONUtils } from './jsonUtils.js';
import { FileSystemInterface } from './fsInterface.js';

export class FileProcessor {
    static fsInterface = new FileSystemInterface();

    static async processStructure(structure, basePath, specificFiles = null) {
        if (!structure.project || !structure.project.rootDirectory) {
            throw new Error('Invalid project structure. Must contain project and rootDirectory.');
        }

        const rootDir = structure.project.rootDirectory;
        const projectPath = path.join(basePath, rootDir.name);

        // Create the root directory
        await this.fsInterface.createDir(projectPath);

        // Process the contents
        await this.processContents(rootDir.contents, projectPath, specificFiles);
    }

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

    static async ensureDirectoryExists(dirPath) {
        await this.fsInterface.createDir(dirPath);
    }

    static async ensureFileExists(filePath) {
        // Create the directory if it doesn't exist
        await this.ensureDirectoryExists(path.dirname(filePath));
        // Create an empty file if it doesn't exist
        const exists = await this.fsInterface.readFile(filePath);
        if (!exists) {
            await this.fsInterface.writeFile(filePath, '');
        }
    }

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
                    await this.fsInterface.writeFile(filePath, fileContents);
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
