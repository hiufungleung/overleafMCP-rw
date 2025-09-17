const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { promisify } = require('util');
const execAsync = promisify(exec);

// Utility function for safe command execution
function sanitizeCommitMessage(message) {
    return message
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/"/g, '\\"')    // Escape quotes
        .replace(/\n/g, ' ')     // Replace newlines with spaces
        .replace(/\r/g, '')      // Remove carriage returns
        .replace(/\$/g, '\\$')   // Escape dollar signs
        .replace(/`/g, '\\`')    // Escape backticks
        .trim();
}

class OverleafGitClient {
    constructor(gitToken, projectId, tempDir = null) {
        this.gitToken = gitToken;
        this.projectId = projectId;
        // Use OS temp directory if not specified, with absolute path
        this.tempDir = tempDir || path.join(os.tmpdir(), 'overleaf-mcp');
        // Use git:<TOKEN> format as specified by Overleaf
        this.repoUrl = `https://git:${gitToken}@git.overleaf.com/${projectId}`;
        this.localPath = path.join(this.tempDir, projectId);
    }

    async cloneOrPull() {
        try {
            // Ensure temp directory exists with proper permissions
            await fs.mkdir(this.tempDir, { recursive: true, mode: 0o755 });

            // Check if repo already exists
            try {
                await fs.access(this.localPath);
                // Pull latest changes
                await execAsync(`cd "${this.localPath}" && git pull`, {
                    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
                });
            } catch (accessError) {
                // Clone the repository
                await execAsync(`git clone "${this.repoUrl}" "${this.localPath}"`, {
                    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
                });
            }
        } catch (error) {
            throw error;
        }
    }

    async listFiles(extension = '.tex') {
        await this.cloneOrPull();
        
        const files = [];
        async function walk(dir) {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory() && entry.name !== '.git') {
                    await walk(fullPath);
                } else if (entry.isFile() && (!extension || entry.name.endsWith(extension))) {
                    files.push(fullPath);
                }
            }
        }
        
        await walk(this.localPath);
        return files.map(f => path.relative(this.localPath, f));
    }

    async readFile(filePath) {
        await this.cloneOrPull();
        const fullPath = path.join(this.localPath, filePath);
        return await fs.readFile(fullPath, 'utf8');
    }

    async getSections(filePath) {
        const content = await this.readFile(filePath);
        
        const sections = [];
        const sectionRegex = /\\(part|chapter|section|subsection|subsubsection|paragraph|subparagraph)\*?\{([^}]+)\}/g;
        
        let match;
        let lastIndex = 0;
        
        while ((match = sectionRegex.exec(content)) !== null) {
            const type = match[1];
            const title = match[2];
            const startIndex = match.index;
            
            if (sections.length > 0) {
                sections[sections.length - 1].content = content.substring(lastIndex + match[0].length, startIndex).trim();
            }
            
            sections.push({
                type,
                title,
                startIndex,
                content: ''
            });
            
            lastIndex = startIndex;
        }
        
        if (sections.length > 0) {
            sections[sections.length - 1].content = content.substring(lastIndex + sections[sections.length - 1].title.length + 3).trim();
        }
        
        return sections;
    }

    async getSection(filePath, sectionTitle) {
        const sections = await this.getSections(filePath);
        return sections.find(s => s.title === sectionTitle);
    }

    async getSectionsByType(filePath, type) {
        const sections = await this.getSections(filePath);
        return sections.filter(s => s.type === type);
    }

    async writeFile(filePath, content) {
        await this.cloneOrPull();
        const fullPath = path.join(this.localPath, filePath);
        const dir = path.dirname(fullPath);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(fullPath, content, 'utf8');
        return fullPath;
    }

    async deleteFile(filePath) {
        await this.cloneOrPull();
        const fullPath = path.join(this.localPath, filePath);
        await fs.unlink(fullPath);
        return fullPath;
    }

    async commit(message) {
        const sanitizedMessage = sanitizeCommitMessage(message);
        const commands = [
            `cd "${this.localPath}"`,
            'git add -A',
            `git commit -m "${sanitizedMessage}"`
        ];

        try {
            const { stdout } = await execAsync(commands.join(' && '), {
                env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
                timeout: 30000 // 30 second timeout
            });
            return stdout || 'Commit successful';
        } catch (error) {
            if (error.message.includes('nothing to commit')) {
                return 'Nothing to commit, working tree clean';
            }
            if (error.message.includes('timeout')) {
                throw new Error('Commit operation timed out');
            }
            throw new Error(`Commit failed: ${error.message}`);
        }
    }

    async push() {
        try {
            const { stdout } = await execAsync(`cd "${this.localPath}" && git push`, {
                env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
                timeout: 60000 // 60 second timeout for network operations
            });
            return stdout || 'Push successful';
        } catch (error) {
            if (error.message.includes('timeout')) {
                throw new Error('Push operation timed out - check network connection');
            }
            if (error.message.includes('403')) {
                throw new Error('Push failed: Authentication error - check git token');
            }
            throw new Error(`Push failed: ${error.message}`);
        }
    }

    async status() {
        await this.cloneOrPull();
        const { stdout } = await execAsync(`cd "${this.localPath}" && git status`, {
            env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
        });
        return stdout;
    }
}

module.exports = OverleafGitClient;