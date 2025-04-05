// utils/fileSystem.js
// Note: This file demonstrates modern File System Access API usage 
// which only works in Chrome and some Chromium-based browsers

// Function to open a file using the modern File System Access API
export const openFileModern = async () => {
    try {
      // Show file picker
      const [fileHandle] = await window.showOpenFilePicker({
        multiple: false,
        types: [
          {
            description: 'Text Files',
            accept: {
              'text/*': ['.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.md', '.json']
            }
          }
        ]
      });
      
      // Get the file
      const file = await fileHandle.getFile();
      
      // Read the file content
      const content = await file.text();
      
      // Return file information
      return {
        name: file.name,
        content,
        language: getLanguageFromFileName(file.name),
        fileHandle, // Store the file handle for saving later
      };
    } catch (error) {
      console.error('Error opening file:', error);
      return null;
    }
  };
  
  // Function to save a file using the modern File System Access API
  export const saveFileModern = async (fileHandle, content) => {
    try {
      // Create a writable stream
      const writable = await fileHandle.createWritable();
      
      // Write the content
      await writable.write(content);
      
      // Close the file
      await writable.close();
      
      return true;
    } catch (error) {
      console.error('Error saving file:', error);
      return false;
    }
  };
  
  // Function to open a directory using the modern File System Access API
  export const openDirectoryModern = async () => {
    try {
      // Show directory picker
      const directoryHandle = await window.showDirectoryPicker();
      
      // Array to store file info
      const files = [];
      
      // Function to recursively process directories
      const processDirectory = async (dirHandle, path = '') => {
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file') {
            // It's a file, get its content
            const file = await entry.getFile();
            
            // Skip binary files and very large files
            if (!file.type.startsWith('text/') && !isSupportedFileType(file.name)) {
              if (file.size < 1000000) { // Skip files larger than ~1MB
                try {
                  const content = await file.text();
                  files.push({
                    name: file.name,
                    content,
                    language: getLanguageFromFileName(file.name),
                    path: path + file.name,
                    fileHandle: entry // Store the file handle for saving later
                  });
                } catch (e) {
                  console.log(`Skipping file ${file.name}: likely binary`);
                }
              }
            } else {
              const content = await file.text();
              files.push({
                name: file.name,
                content,
                language: getLanguageFromFileName(file.name),
                path: path + file.name,
                fileHandle: entry // Store the file handle for saving later
              });
            }
          } else if (entry.kind === 'directory') {
            // It's a directory, process it recursively
            const newDirHandle = await dirHandle.getDirectoryHandle(entry.name);
            await processDirectory(newDirHandle, `${path}${entry.name}/`);
          }
        }
      };
      
      // Start processing from the root directory
      await processDirectory(directoryHandle);
      
      return {
        files,
        directoryHandle,
        name: directoryHandle.name
      };
    } catch (error) {
      console.error('Error opening directory:', error);
      return null;
    }
  };
  
  // Helper functions
  const getLanguageFromFileName = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    const languageMap = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'go': 'go',
      'php': 'php',
      'rb': 'ruby',
      'rs': 'rust'
    };
    
    return languageMap[extension] || 'plaintext';
  };
  
  const isSupportedFileType = (fileName) => {
    const supportedExtensions = [
      'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'json', 'md', 
      'py', 'java', 'cpp', 'c', 'go', 'php', 'rb', 'rs', 'txt'
    ];
    
    const extension = fileName.split('.').pop().toLowerCase();
    return supportedExtensions.includes(extension);
  };