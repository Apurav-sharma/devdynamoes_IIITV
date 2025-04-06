// components/Sidebar.js
import React, { useState, useEffect } from 'react';

export default function Sidebar({
  files,
  activeFileId,
  onFileSelect,
  projectFolder,
  onDeleteFile,
  onAddFile,
  onAddFolder,
}) {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [hoveredFileId, setHoveredFileId] = useState(null);
  const [hoveredFolder, setHoveredFolder] = useState(null);

  // Function to render individual files
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
            onClick={(e) => {
              e.stopPropagation();
              onDeleteFile(file.id);
            }}
            className="text-gray-400 hover:text-white hover:bg-red-600 rounded p-1 h-5 w-5 flex items-center justify-center"
            title="Delete file"
          >
            ×
          </button>
        )}
      </div>
    ));
  };

  // Function to create a new file with proper path handling
  const createNewFile = (parentPath = '') => {
    const fileName = prompt("Enter file name:", "untitled.js");
    if (!fileName) return;
    
    // Generate a new file ID
    const newId = files.length > 0 ? Math.max(...files.map(f => f.id)) + 1 : 1;
    
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
    
    if (typeof onAddFile === 'function') {
      onAddFile(newFile);
    }
  };
  
  // Function to create a new folder with proper path handling
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
    
    if (typeof onAddFolder === 'function') {
      onAddFolder(fullPath);
      // Auto-expand the parent folder
      if (parentPath) {
        setExpandedFolders(prev => ({ ...prev, [parentPath]: true }));
      }
    }
  };

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

  // Helper function to get parent path from a full path
  const getParentPath = (path) => {
    const parts = path.split('/');
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('/');
  };

  // Reset expanded folders when project changes
  useEffect(() => {
    if (projectFolder) {
      const initialExpanded = {};
      files.forEach(file => {
        if (file.path) {
          const parentPath = getParentPath(file.path);
          if (parentPath) {
            initialExpanded[parentPath] = true;
          }
        }
      });
      setExpandedFolders(initialExpanded);
    }
  }, [projectFolder, files]);

  // Modified organizeFilesByFolder to better handle nested structures
  const organizeFilesByFolder = () => {
    const fileTree = { folders: {}, files: [] };
    
    files.forEach(file => {
      if (!file.path || file.path === file.name) {
        fileTree.files.push(file);
        return;
      }
      
      const pathParts = file.path.split('/');
      let currentLevel = fileTree;
      
      // Traverse or create the folder structure
      for (let i = 0; i < pathParts.length - 1; i++) {
        const folderName = pathParts[i];
        
        if (!currentLevel.folders[folderName]) {
          currentLevel.folders[folderName] = { folders: {}, files: [] };
        }
        
        currentLevel = currentLevel.folders[folderName];
      }
      
      // Add the file to the correct level
      currentLevel.files.push(file);
    });
    
    return fileTree;
  };
  
  const toggleFolder = (folderPath, e) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };
  
  // Modified renderFolderStructure to properly handle nested paths
  const renderFolderStructure = (tree, currentPath = '') => {
    if (!tree) return null;
    
    return (
      <div style={{ paddingLeft: currentPath ? '0.75rem' : '0' }}>
        {tree.files && tree.files.length > 0 && (
          <div>
            {renderFiles(tree.files)}
          </div>
        )}
        
        {tree.folders && Object.entries(tree.folders).map(([folderName, folderContents]) => {
          const folderPath = currentPath ? `${currentPath}/${folderName}` : folderName;
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
                  onClick={(e) => toggleFolder(folderPath, e)}
                >
                  <span className="mr-2">{isExpanded ? '📂' : '📁'}</span>
                  <span className="truncate">{folderName}</span>
                </div>
                
                {(hoveredFolder === folderPath || isExpanded) && (
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
                      +
                    </button>
                  </div>
                )}
              </div>
              
              {isExpanded && (
                <div>
                  {renderFolderStructure(folderContents, folderPath)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

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
            {renderFolderStructure(organizeFilesByFolder())}
          </div>
        )}
      </div>
    </div>
  );
}