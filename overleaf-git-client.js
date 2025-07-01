const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');
const execAsync = promisify(exec);

class OverleafGitClient {
    constructor(gitToken, projectId, tempDir = './temp') {
        this.gitToken = gitToken;
        this.projectId = projectId;
        this.tempDir = tempDir;
        this.repoUrl = `https://git:${gitToken}@git.overleaf.com/${projectId}`;
        this.localPath = path.join(tempDir, projectId);
    }

    async cloneOrPull() {
        try {
            await fs.access(this.localPath);
            await execAsync(`cd "${this.localPath}" && git pull`, { 
                env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
            });
        } catch {
            await fs.mkdir(this.tempDir, { recursive: true });
            await execAsync(`git clone "${this.repoUrl}" "${this.localPath}"`, {
                env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
            });
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
}

module.exports = OverleafGitClient;