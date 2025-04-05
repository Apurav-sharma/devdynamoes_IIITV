// utils/fileSystem.js
// Note: This file demonstrates modern File System Access API usage 
// which only works in Chrome and some Chromium-based browsers

// Function to detect if File System Access API is available
export const isFileSystemAccessSupported = () => {
  return 'showOpenFilePicker' in window && 'showDirectoryPicker' in window;
};

// Function to open a file using the modern File System Access API
export const openFileModern = async () => {
  if (!isFileSystemAccessSupported()) {
    console.warn('File System Access API not supported in this browser');
    return null;
  }
  
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
  if (!isFileSystemAccessSupported()) {
    console.warn('File System Access API not supported in this browser');
    return false;
  }
  
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
  if (!isFileSystemAccessSupported()) {
    console.warn('File System Access API not supported in this browser');
    return null;
  }
  
  try {
    // Show directory picker
    const directoryHandle = await window.showDirectoryPicker();
    
    // Array to store file info
    const files = [];
    let fileId = 1;
    
    // Function to recursively process directories
    const processDirectory = async (dirHandle, path = '') => {
      for await (const entry of dirHandle.values()) {
        if (entry.kind === 'file') {
          try {
            // It's a file, get its content
            const file = await entry.getFile();
            
            // Skip binary files and very large files
            if (isLikelyTextFile(file)) {
              try {
                const content = await file.text();
                files.push({
                  id: fileId++,
                  name: file.name,
                  content,
                  language: getLanguageFromFileName(file.name),
                  path: path + file.name,
                  fileHandle: entry // Store the file handle for saving later
                });
              } catch (e) {
                console.log(`Skipping file ${file.name}: ${e.message}`);
              }
            }
          } catch (error) {
            console.error(`Error processing file ${entry.name}:`, error);
          }
        } else if (entry.kind === 'directory') {
          try {
            // It's a directory, process it recursively
            await processDirectory(entry, `${path}${entry.name}/`);
          } catch (error) {
            console.error(`Error processing directory ${entry.name}:`, error);
          }
        }
      }
    };
    
    // Start processing from the root directory
    await processDirectory(directoryHandle, '');
    
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

const isLikelyTextFile = (file) => {
  // Common text file extensions
  const textExtensions = [
    'txt', 'js', 'jsx', 'ts', 'tsx', 'html', 'css', 'scss', 'json', 'md',
    'py', 'java', 'cpp', 'c', 'h', 'go', 'php', 'rb', 'rs', 'xml', 'yaml',
    'yml', 'ini', 'cfg', 'conf', 'sh', 'bat', 'csv', 'log', 'sql'
  ];
  
  const extension = file.name.split('.').pop().toLowerCase();
  
  // Check by extension first
  if (textExtensions.includes(extension)) {
    return true;
  }
  
  // If it has a known text MIME type
  if (file.type && (
    file.type.startsWith('text/') || 
    file.type === 'application/json' ||
    file.type === 'application/xml' ||
    file.type === 'application/javascript'
  )) {
    return true;
  }
  
  // Size heuristic - text files are usually not too large
  // (avoid trying to load very large files)
  return file.size < 1000000; // Less than 1MB
};