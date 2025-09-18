# Overleaf MCP Server with WRITE Functionality

An MCP (Model Context Protocol) server that provides access to Overleaf projects via Git integration. This allows Claude and other MCP clients to read and write LaTeX files, analyze document structure, extract content, and manage Overleaf projects with full Git workflow support.

**Note:** All functionality requires an Overleaf membership with Git access (available with free trial or paid subscription).

## Features

### Read Operations

- 📄 **File Management**: List and read files from Overleaf projects
- 📋 **Document Structure**: Parse LaTeX sections and subsections
- 🔍 **Content Extraction**: Extract specific sections by title
- 📊 **Project Summary**: Get overview of project status and structure
- 🏗️ **Multi-Project Support**: Manage multiple Overleaf projects

### Write Operations *(Enhanced functionality)*

- ✏️ **File Writing**: Create and update LaTeX files
- 🗑️ **File Deletion**: Remove files from projects
- 📝 **Git Integration**: Commit changes with custom messages
- 🚀 **Sync to Overleaf**: Push changes back to Overleaf
- 📈 **Git Status**: Monitor repository state and changes

## Installation

1. Clone this repository
2. Ensure [Node.js](https://nodejs.org/en/download) has been installed on your machine.
3. Install dependencies:

   ```bash
   npm install
   ```

4. Set up your projects configuration:

   ```bash
   cp projects.example.json projects.json
   ```

5. Edit `projects.json` with your Overleaf credentials:

   ```json
   {
     "projects": {
       "default": {
         "name": "My Paper",
         "projectId": "YOUR_OVERLEAF_PROJECT_ID",
         "gitToken": "YOUR_OVERLEAF_GIT_TOKEN"
       }
     }
   }
   ```

## Getting Overleaf Credentials

**Important:** All operations require an Overleaf membership with Git access. This is available with:

- Free trial (limited time)
- Paid subscription plans

1. **Git Token**:
   - Go to Overleaf Account Settings → Git Integration
   - Click "Create Token"
   - **Note:** Git integration requires an Overleaf membership

2. **Project ID**:
   - Open your Overleaf project
   - Find it in the URL: `https://www.overleaf.com/project/[PROJECT_ID]`

## Claude Desktop Setup

Add to your Claude Desktop configuration file:

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
  - Be careful of the blankspace in `Application Support`.

**Linux**: `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "overleaf": {
      "command": "node",
      "args": [
        "/path/to/OverleafMCP/overleaf-mcp-server.js"
      ]
    }
  }
}
```

Restart Claude Desktop after configuration.

## Available Tools

### Read Operations

#### `list_projects`

List all configured projects.

#### `list_files`

List files in a project (default: .tex files).

- `extension`: File extension filter (optional)
- `projectName`: Project identifier (optional, defaults to "default")

#### `read_file`

Read a specific file from the project.

- `filePath`: Path to the file (required)
- `projectName`: Project identifier (optional)

#### `get_sections`

Get all sections from a LaTeX file.

- `filePath`: Path to the LaTeX file (required)
- `projectName`: Project identifier (optional)

#### `get_section_content`

Get content of a specific section.

- `filePath`: Path to the LaTeX file (required)
- `sectionTitle`: Title of the section (required)
- `projectName`: Project identifier (optional)

#### `status_summary`

Get a comprehensive project status summary.

- `projectName`: Project identifier (optional)

### Write Operations

#### `write_file`

Write or update a file in the project.

- `filePath`: Path to the file (required)
- `content`: Content to write to the file (required)
- `projectName`: Project identifier (optional)

#### `delete_file`

Delete a file from the project.

- `filePath`: Path to the file to delete (required)
- `projectName`: Project identifier (optional)

#### `commit_changes`

Commit all changes to the repository.

- `message`: Commit message (required)
- `projectName`: Project identifier (optional)

#### `push_changes`

Push committed changes to Overleaf.

- `projectName`: Project identifier (optional)

#### `git_status`

Get git status of the project.

- `projectName`: Project identifier (optional)

## Usage Examples

### Read Operations

```bash
# List all projects
Use the list_projects tool

# Get project overview
Use status_summary tool

# Read main.tex file
Use read_file with filePath: "main.tex"

# Get Introduction section
Use get_section_content with filePath: "main.tex" and sectionTitle: "Introduction"

# List all sections in a file
Use get_sections with filePath: "main.tex"
```

### Write Operations

```bash
# Create or update a file
Use write_file with filePath: "new_chapter.tex" and content: "\\section{New Chapter}\nContent here..."

# Delete a file
Use delete_file with filePath: "old_file.tex"

# Check what has changed
Use git_status tool

# Commit your changes
Use commit_changes with message: "Add new chapter and remove old file"

# Push changes to Overleaf
Use push_changes tool
```

## Multi-Project Usage

To work with multiple projects, add them to `projects.json`:

```json
{
  "projects": {
    "default": {
      "name": "Main Paper",
      "projectId": "project-id-1",
      "gitToken": "token-1"
    },
    "paper2": {
      "name": "Second Paper",
      "projectId": "project-id-2",
      "gitToken": "token-2"
    }
  }
}
```

Then specify the project in tool calls:

```bash
Use get_section_content with projectName: "paper2", filePath: "main.tex", sectionTitle: "Methods"
```

## File Structure

```
OverleafMCP/
├── overleaf-mcp-server.js    # Main MCP server
├── overleaf-git-client.js    # Git client library
├── projects.json             # Your project configuration (gitignored)
├── projects.example.json     # Example configuration
├── package.json              # Dependencies
└── README.md                 # This file
```

## Security Notes

- `projects.json` is gitignored to protect your credentials
- Never commit real project IDs or Git tokens
- Use the provided `projects.example.json` as a template

## Attribution

This project is forked from the 
[mjyoo2/OverleafMCP](https://github.com/mjyoo2/OverleafMCP). The original implementation provided read-only functionality. This fork adds enhanced write operations including file creation, editing, deletion, and full Git workflow support (commit and push to Overleaf).

## License

MIT License