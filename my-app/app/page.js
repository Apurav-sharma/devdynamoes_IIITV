// app/page.js
"use client";
import { useState, useEffect, useRef } from 'react';
import { openFileModern, saveFileModern, openDirectoryModern } from './utils/fileSystem';
import Editor from './components/Editor';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import StatusBar from './components/StatusBar';
import FileAccessManager from './components/FileAccessManager';
import VoiceAssistant from './components/voice/record';

export default function Home() {
  const [files, setFiles] = useState([
    { id: 1, name: 'index.js', content: 'console.log("Hello World");', language: 'javascript' }
  ]);
  const [activeFile, setActiveFile] = useState(files[0]);
  const [theme, setTheme] = useState('vs-dark');
  const [projectFolder, setProjectFolder] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const [transcript, setTranscript] = useState('');
  const editorRef = useRef(null);

  const handleFileSelect = (fileId) => {
    const file = files.find(f => f.id === fileId);
    setActiveFile(file);
  };

  const handleContentChange = (newContent) => {
    const updatedFiles = files.map(f =>
      f.id === activeFile.id ? { ...f, content: newContent } : f
    );
    setFiles(updatedFiles);
    setActiveFile({ ...activeFile, content: newContent });
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
    if (newFiles.length) {
      setActiveFile(newFiles[0]);
    }

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
    const existingIds = files.map(f => f.id);
    let maxId = existingIds.length ? Math.max(...existingIds) : 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const reader = new FileReader();

      const readFileContent = new Promise((resolve) => {
        reader.onload = (event) => {
          const content = event.target.result;
          resolve({
            id: ++maxId,
            name: file.name,
            content,
            language: getLanguageFromFileName(file.name),
            path: file.webkitRelativePath // Store the relative path
          });
        };
      });

      reader.readAsText(file);
      newFiles.push(await readFileContent);
    }

    setFiles(newFiles);
    if (newFiles.length) setActiveFile(newFiles[0]);

    // Reset the file input
    e.target.value = null;
  };

  const saveFile = () => {
    if (!activeFile) return;

    const blob = new Blob([activeFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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

  // Handle transcript updates from voice assistant
  const handleTranscriptUpdate = (newTranscript) => {
    setTranscript(newTranscript);
    // Process voice commands if needed
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
        />
        <div className="flex flex-col flex-1">
          <Editor
            value={activeFile?.content || ''}
            language={activeFile?.language || 'javascript'}
            onChange={handleContentChange}
            theme={theme}
            editorRef={editorRef}
          />
          <VoiceAssistant editorRef={editorRef} />
        </div>
      </div>
      <StatusBar language={activeFile?.language} theme={theme} />

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
        // Using data attributes for directory selection which are more widely supported
        data-directory=""
        data-webkitdirectory=""
      />
      <FileAccessManager />
    </div>
  );
}