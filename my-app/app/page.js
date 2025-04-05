// app/page.js
"use client";
import { useState, useEffect, useRef } from 'react';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import StatusBar from './components/StatusBar';
import FileAccessManager from './components/FileAccessManager';

export default function Home() {
  const [files, setFiles] = useState([
    { id: 1, name: 'index.js', content: 'console.log("Hello World");', language: 'javascript' }
  ]);
  const [activeFile, setActiveFile] = useState(files[0]);
  const [theme, setTheme] = useState('vs-dark');
  const [projectFolder, setProjectFolder] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleFileSelect = (fileId) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      setActiveFile(file);
    }
  };

  const handleContentChange = (newContent) => {
    const updatedFiles = files.map(f =>
      f.id === activeFile.id ? { ...f, content: newContent } : f
    );
    setFiles(updatedFiles);
    setActiveFile({ ...activeFile, content: newContent });
  };

  // New file deletion handler
  const handleDeleteFile = (fileId) => {
    // Check if trying to delete the active file
    if (activeFile && activeFile.id === fileId) {
      // Find a new file to make active
      const remainingFiles = files.filter(f => f.id !== fileId);

      if (remainingFiles.length > 0) {
        // Set the first remaining file as active
        setActiveFile(remainingFiles[0]);
      } else {
        // If no files left, set activeFile to null
        setActiveFile(null);
      }
    }

    // Remove the file from the files array
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const toggleTheme = () => {
    setTheme(theme === 'vs-dark' ? 'vs-light' : 'vs-dark');
  };

  const openFile = async () => {
    fileInputRef.current.click();
  };
  const handleFileUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles.length) return;

    const newFiles = [];
    const existingIds = files.map(f => f.id);
    let maxId = existingIds.length ? Math.max(...existingIds) : 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const reader = new FileReader();

      // Create a promise to handle the asynchronous file reading
      const readFileContent = new Promise((resolve) => {
        reader.onload = (event) => {
          const content = event.target.result;
          resolve({
            id: ++maxId,
            name: file.name,
            content,
            language: getLanguageFromFileName(file.name),
            path: file.path || file.webkitRelativePath || file.name // Store path if available
          });
        };
      });

      reader.readAsText(file);
      newFiles.push(await readFileContent);
    }

    setFiles(prev => [...prev, ...newFiles]);
    setActiveFile(newFiles[0]);

    // Reset the file input
    e.target.value = null;
  };

  const openFolder = () => {
    folderInputRef.current.click();
  };

  const handleFolderUpload = async (e) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles.length) return;

    // Try to determine the project folder from the first file's path
    const firstFilePath = selectedFiles[0].webkitRelativePath;
    const projectName = firstFilePath.split('/')[0];
    setProjectFolder(projectName);

    const newFiles = [];
    let maxId = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      // Skip directories and non-text files
      if (file.size === 0 || !isLikelyTextFile(file)) continue;

      try {
        const reader = new FileReader();

        const readFileContent = new Promise((resolve, reject) => {
          reader.onload = (event) => {
            try {
              const content = event.target.result;
              resolve({
                id: ++maxId,
                name: file.name,
                content,
                language: getLanguageFromFileName(file.name),
                path: file.webkitRelativePath // Store the relative path
              });
            } catch (error) {
              reject(error);
            }
          };
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
        });

        reader.readAsText(file);
        const fileData = await readFileContent;
        newFiles.push(fileData);
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
      }
    }

    // Only update if we have files
    if (newFiles.length > 0) {
      setFiles(newFiles);
      setActiveFile(newFiles[0]);
    }

    // Reset the file input
    e.target.value = null;
  };
  // const handleAddFile = (newFile) => {
  //   setFiles(prev => [...prev, newFile]);
  //   setActiveFile(newFile);
  // };

  // const handleAddFolder = (folderPath) => {
  //   // Folders don't need to be tracked in state directly, 
  //   // they're inferred from file paths
  //   // We could create an empty .gitkeep file in the folder to make it appear

  //   const folderName = folderPath.split('/').pop();
  //   const placeholderFile = {
  //     id: Date.now(), // Use timestamp as a quick unique ID
  //     name: '.gitkeep',
  //     content: '',
  //     language: 'plaintext',
  //     path: folderPath + '/.gitkeep'
  //   };

  //   setFiles(prev => [...prev, placeholderFile]);

  //   // Optionally show a success message
  //   alert(`Folder "${folderName}" created successfully`);
  // };

const handleAddFile = (newFile) => {
  setFiles(prev => [...prev, newFile]);
  setActiveFile(newFile);
};

const handleAddFolder = (folderPath) => {
  const folderName = folderPath.split('/').pop();
  const placeholderFile = {
    id: Date.now(),
    name: '.gitkeep',
    content: '',
    language: 'plaintext',
    path: `${folderPath}/.gitkeep`
  };
  
  setFiles(prev => [...prev, placeholderFile]);
};

  // const saveFile = () => {
  //   if (!activeFile) return;

  //   const blob = new Blob([activeFile.content], { type: 'text/plain' });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement('a');
  //   a.href = url;
  //   a.download = activeFile.name;
  //   document.body.appendChild(a);
  //   a.click();
  //   document.body.removeChild(a);
  //   URL.revokeObjectURL(url);
  // };
  const saveFile = async () => {
    if (!activeFile) return;
    
    if (activeFile.fileHandle) {
      // Use modern API if available
      const success = await saveFileModern(activeFile.fileHandle, activeFile.content);
      if (success) {
        alert('File saved successfully!');
      } else {
        alert('Error saving file');
      }
    } else {
      // Fallback to download method
      const blob = new Blob([activeFile.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const createNewFile = () => {
    const fileName = prompt("Enter file name:", "untitled.js");
    if (!fileName) return;

    const existingIds = files.map(f => f.id);
    const newId = existingIds.length ? Math.max(...existingIds) + 1 : 1;

    const newFile = {
      id: newId,
      name: fileName,
      content: '',
      language: getLanguageFromFileName(fileName),
      path: projectFolder ? `${projectFolder}/${fileName}` : fileName
    };

    setFiles(prev => [...prev, newFile]);
    setActiveFile(newFile);
  };

  // Helper function to determine language from file extension
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

  // Helper to check if a file is likely a text file we can display
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

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <Navbar
        filename={activeFile?.name}
        toggleTheme={toggleTheme}
        theme={theme}
        openFile={openFile}
        openFolder={openFolder}
        saveFile={saveFile}
        createNewFile={createNewFile}
        projectFolder={projectFolder}
      />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          files={files}
          activeFileId={activeFile?.id}
          onFileSelect={handleFileSelect}
          projectFolder={projectFolder}
          onDeleteFile={handleDeleteFile}
          onAddFile={handleAddFile}
          onAddFolder={handleAddFolder}
        />
        {activeFile ? (
          <Editor
            value={activeFile.content || ''}
            language={activeFile.language || 'javascript'}
            onChange={handleContentChange}
            theme={theme}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            No files open. Create a new file or open an existing one.
          </div>
        )}
      </div>
      <StatusBar
        language={activeFile?.language}
        theme={theme}
        filePath={activeFile?.path}
      />

      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={handleFileUpload}
        multiple
      />
      <input
        type="file"
        ref={folderInputRef}
        style={{ display: 'none' }}
        onChange={handleFolderUpload}
        directory=""
        webkitdirectory=""
      />
      <FileAccessManager />
    </div>
  );
}