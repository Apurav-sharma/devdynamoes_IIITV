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
import AiPanel from './components/AiPanel';
import { diff_match_patch } from 'diff-match-patch';

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
  const [showAiPanel, setShowAiPanel] = useState(false);
  const editorRef = useRef(null);
  const [fileVersions, setFileVersions] = useState({});

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

  const toggleAiPanel = () => {
    setShowAiPanel(!showAiPanel);
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
        console.error(`Error processing file ${file.name}:, error`);
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

  const goToVersion = async (direction) => {
    if (!activeFile) return;

    const path = activeFile.path || activeFile.name;
    const current = fileVersions[path] || 0;
    const newVersion = Math.max(-1, current + direction);

    try {
      const res = await fetch(`/api/restoreVersion?path=${encodeURIComponent(path)}&version=${newVersion}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.message);

      const updatedFiles = files.map(f =>
        f.id === activeFile.id ? { ...f, content: data.content } : f
      );
      setFiles(updatedFiles);
      setActiveFile({ ...activeFile, content: data.content });
      setFileVersions(prev => ({ ...prev, [path]: data.version }));

      console.log(`Restored ${path} to version ${data.version}`);
    } catch (err) {
      console.error("Version restore failed:", err);
      alert("Could not restore version.");
    }
  };

  const runFile = async () => {
    try {
      const dmp = new diff_match_patch();

      for (const file of files) {
        // 1. Fetch last version from MongoDB
        const res = await fetch(`/api/files?path=${encodeURIComponent(file.path || file.name)}`);
        const data = await res.json();

        const base = data?.latestContent || '';
        const newContent = file.content;

        // 2. Compute patch between last content and new content
        const diffs = dmp.diff_main(base, newContent);
        dmp.diff_cleanupSemantic(diffs);
        const patch = dmp.patch_toText(dmp.patch_make(base, diffs));

        // 3. If no change, skip
        if (!patch.trim()) {
          console.log(`No changes in ${file.path}, skipping.`);
          continue;
        }

        // 4. Save patch to MongoDB
        const saveRes = await fetch('/api/savePatch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: file.path || file.name,
            patch: patch,
            newContent: newContent, // Optional: for base update
            author: {
              name: "Udit Singh",
              email: "udit@example.com"
            }
          })
        });

        const result = await saveRes.json();

        if (!saveRes.ok) throw new Error(result.message);

        console.log(`Patch saved for: ${file.path} `);
      }

      alert(`All patches saved!`);
    } catch (error) {
      console.error("Patch save failed:", error);
      alert("Error saving patch.");
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

  const applyAiChangesToEditor = (codeBlock) => {
    if (!activeFile) return;
    handleContentChange(codeBlock);
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
        showAiPanel={toggleAiPanel}
        runFile={runFile}
        preVersion={() => goToVersion(-1)}
        postVersion={() => goToVersion(1)}
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
        {showAiPanel && (
          <AiPanel
            theme={theme}
            toggleAiPanel={toggleAiPanel}
            activeFile={activeFile}
            applyAiChangesToEditor={applyAiChangesToEditor}
            editorRef={editorRef}
          />
        )}
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