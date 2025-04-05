// components/Sidebar.js
import React, { useState, useEffect } from 'react';

export default function Sidebar({ files, activeFileId, onFileSelect, projectFolder, onDeleteFile }) {
  // State to track expanded folders
  const [expandedFolders, setExpandedFolders] = useState({});
  // State to track which file is being hovered (to show delete button)
  const [hoveredFileId, setHoveredFileId] = useState(null);
  // State to track which folder is being hovered (to show action buttons)
  const [hoveredFolder, setHoveredFolder] = useState(null);

  // Function to create a new file
  const createNewFile = (parentPath = '') => {
    const fileName = prompt("Enter file name:", "untitled.js");
    if (!fileName) return;
    
    // Generate a new file ID
    const existingIds = files.map(f => f.id);
    const newId = existingIds.length ? Math.max(...existingIds) + 1 : 1;
    
    // Create the full path for the file
    let fullPath = fileName;
    if (parentPath) {
      fullPath = `${parentPath}/${fileName}`;
    } else if (projectFolder) {
      fullPath = `${projectFolder}/${fileName}`;
    }
    
    // Create new file object
    const newFile = {
      id: newId,
      name: fileName,
      content: '',
      language: getLanguageFromFileName(fileName),
      path: fullPath
    };
    
    // Add to files array (this would need to be passed up to the parent)
    if (typeof onAddFile === 'function') {
      onAddFile(newFile);
    } else {
      // Fallback if onAddFile isn't provided
      alert("New file created, but handler not implemented: " + fullPath);
      console.log("New file would be created:", newFile);
    }
  };
  
  // Function to create a new folder
  const createNewFolder = (parentPath = '') => {
    const folderName = prompt("Enter folder name:", "new-folder");
    if (!folderName) return;
    
    // Create the full path for the folder
    let fullPath = folderName;
    if (parentPath) {
      fullPath = `${parentPath}/${folderName}`;
    } else if (projectFolder) {
      fullPath = `${projectFolder}/${folderName}`;
    }
    
    // Create the folder (you would need to implement this in your file system)
    if (typeof onAddFolder === 'function') {
      onAddFolder(fullPath);
    } else {
      // Fallback if onAddFolder isn't provided
      alert("New folder would be created: " + fullPath);
      // Manually add the folder to expanded folders to show it's created
      setExpandedFolders(prev => ({
        ...prev,
        [fullPath]: true
      }));
    }
  };
  
  // Reset expanded folders when project changes
  useEffect(() => {
    if (projectFolder) {
      // Start with all top-level folders expanded
      const initialExpanded = {};
      files.forEach(file => {
        if (file.path) {
          const parts = file.path.split('/');
          if (parts.length > 1) {
            initialExpanded[parts[0]] = true;
          }
        }
      });
      setExpandedFolders(initialExpanded);
    }
  }, [projectFolder, files]);

  // Helper function to get language from file extension
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

  // Function to organize files into a folder structure
  const organizeFilesByFolder = () => {
    const fileTree = { folders: {}, files: [] };
    
    files.forEach(file => {
      if (!file.path || file.path === file.name) {
        fileTree.files.push(file);
        return;
      }
      
      const pathParts = file.path.split('/');
      
      // If it's a top-level file
      if (pathParts.length === 1) {
        fileTree.files.push(file);
        return;
      }
      
      // Handle nested folders
      let currentLevel = fileTree.folders;
      
      // Create folder path if it doesn't exist
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        
        if (!currentLevel[folderName]) {
          currentLevel[folderName] = { folders: {}, files: [] };
        }
        
        currentLevel = currentLevel[folderName].folders;
      }
      
      // Add file to its containing folder
      const fileName = pathParts[pathParts.length - 1];
      const folderPath = pathParts.slice(0, -1).join('/');
      
      // Navigate to the correct folder
      currentLevel = fileTree.folders;
      for (let i = 0; i < pathParts.length - 2; i++) {
        currentLevel = currentLevel[pathParts[i]].folders;
      }
      
      // Add the file to its immediate parent folder
      if (pathParts.length > 1) {
        const parentFolder = pathParts[pathParts.length - 2];
        if (currentLevel[parentFolder]) {
          currentLevel[parentFolder].files.push(file);
        }
      }
    });
    
    return fileTree;
  };
  
  const toggleFolder = (folderPath) => {
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };
  
  // Function to handle file deletion
  const handleDeleteFile = (fileId, e) => {
    e.stopPropagation(); // Prevent triggering file selection
    onDeleteFile(fileId);
  };
  
  // Function to render files inside a folder
  const renderFiles = (fileList) => {
    return fileList.map(file => (
      <div 
        key={file.id}
        onClick={() => onFileSelect(file.id)}
        onMouseEnter={() => setHoveredFileId(file.id)}
        onMouseLeave={() => setHoveredFileId(null)}
        className={`py-1 cursor-pointer flex items-center justify-between group ${file.id === activeFileId ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
        style={{ paddingLeft: '0.75rem', paddingRight: '0.5rem' }}
      >
        <div className="flex items-center overflow-hidden">
          <span className="mr-2 flex-shrink-0">
            {file.language === 'javascript' && '📄'}
            {file.language === 'typescript' && '📄'}
            {file.language === 'css' && '🎨'}
            {file.language === 'html' && '🌐'}
            {file.language === 'json' && '📋'}
            {file.language === 'markdown' && '📝'}
            {!['javascript', 'typescript', 'css', 'html', 'json', 'markdown'].includes(file.language) && '📄'}
          </span>
          <span className="truncate">{file.name}</span>
        </div>
        {(hoveredFileId === file.id || file.id === activeFileId) && (
          <button 
            onClick={(e) => handleDeleteFile(file.id, e)}
            className="text-gray-400 hover:text-white hover:bg-red-600 rounded p-1 h-5 w-5 flex items-center justify-center"
            title="Delete file"
          >
            ×
          </button>
        )}
      </div>
    ));
  };
  
  // Recursive function to render the folder structure
  const renderFolderStructure = (tree, level = 0, parentPath = '') => {
    if (!tree) return null;
    
    return (
      <div style={{ paddingLeft: level > 0 ? '0.75rem' : '0' }}>
        {tree.files && tree.files.length > 0 && (
          <div>
            {renderFiles(tree.files)}
          </div>
        )}
        
        {tree.folders && Object.keys(tree.folders).map(folderName => {
          const folderPath = parentPath ? `${parentPath}/${folderName}` : folderName;
          const isExpanded = expandedFolders[folderPath];
          
          return (
            <div key={folderPath}>
              <div 
                className="py-1 cursor-pointer hover:bg-gray-700 flex items-center justify-between"
                onMouseEnter={() => setHoveredFolder(folderPath)}
                onMouseLeave={() => setHoveredFolder(null)}
              >
                <div 
                  className="flex items-center flex-grow overflow-hidden"
                  style={{ paddingLeft: '0.75rem' }}
                  onClick={() => toggleFolder(folderPath)}
                >
                  <span className="mr-2">{isExpanded ? '📂' : '📁'}</span>
                  <span className="truncate">{folderName}</span>
                </div>
                
                {hoveredFolder === folderPath && (
                  <div className="flex items-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        createNewFile(folderPath);
                      }}
                      className="text-gray-400 hover:text-white hover:bg-blue-600 rounded p-1 h-5 w-5 flex items-center justify-center mr-1"
                      title="New File"
                    >
                      +
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        createNewFolder(folderPath);
                      }}
                      className="text-gray-400 hover:text-white hover:bg-green-600 rounded p-1 h-5 w-5 flex items-center justify-center mr-1"
                      title="New Folder"
                    >
                      📁+
                    </button>
                  </div>
                )}
              </div>
              
              {isExpanded && (
                <div>
                  {renderFolderStructure(tree.folders[folderName], level + 1, folderPath)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };
  
  // Get the organized file tree
  const fileTree = organizeFilesByFolder();

  return (
    <div className="w-64 bg-gray-800 text-white overflow-y-auto flex flex-col">
      <div className="p-3 font-bold flex justify-between items-center border-b border-gray-700">
        <div>{projectFolder ? projectFolder.toUpperCase() : 'EXPLORER'}</div>
        <div className="flex">
          <button 
            onClick={() => createNewFile()}
            className="text-gray-300 hover:text-white mr-2"
            title="New File"
          >
            <span className="text-sm">📄+</span>
          </button>
          <button 
            onClick={() => createNewFolder()}
            className="text-gray-300 hover:text-white"
            title="New Folder"
          >
            <span className="text-sm">📁+</span>
          </button>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {!projectFolder ? (
          <div>
            <div className="px-3 py-2 text-sm text-gray-400">OPEN FILES</div>
            {renderFiles(files)}
          </div>
        ) : (
          <div className="file-tree">
            {renderFolderStructure(fileTree)}
          </div>
        )}
      </div>
    </div>
  );
}