// components/Sidebar.js
import { useState } from 'react';

export default function Sidebar({ files, activeFileId, onFileSelect, projectFolder }) {
  const [expanded, setExpanded] = useState(true);

  // Function to organize files into a folder structure
  const organizeFilesByFolder = () => {
    const fileTree = {};
    
    files.forEach(file => {
      let path = file.path || file.name;
      
      // If it's a file from a folder structure
      if (path.includes('/')) {
        const parts = path.split('/');
        let currentLevel = fileTree;
        
        // Build the folder structure
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!currentLevel[part]) {
            currentLevel[part] = { files: [], folders: {} };
          }
          currentLevel = currentLevel[part].folders;
        }
        
        // Add the file to the deepest folder
        const fileName = parts[parts.length - 1];
        if (!currentLevel.files) currentLevel.files = [];
        currentLevel.files.push(file);
      } else {
        // It's a top-level file
        if (!fileTree.files) fileTree.files = [];
        fileTree.files.push(file);
      }
    });
    
    return fileTree;
  };
  
  const fileTree = organizeFilesByFolder();
  
  // Recursively render the file tree
  const renderFileTree = (tree, level = 0, parentPath = '') => {
    if (!tree) return null;
    
    return (
      <>
        {tree.files && tree.files.map(file => (
          <div 
            key={file.id}
            onClick={() => onFileSelect(file.id)}
            className={`pl-${4 + level * 4} py-1 cursor-pointer flex items-center ${file.id === activeFileId ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
            style={{ paddingLeft: `${1 + level * 1}rem` }}
          >
            <span className="mr-2">
              {file.language === 'javascript' && '📄'}
              {file.language === 'css' && '🎨'}
              {file.language === 'html' && '🌐'}
              {!['javascript', 'css', 'html'].includes(file.language) && '📝'}
            </span>
            {file.name}
          </div>
        ))}
        
        {tree.folders && Object.entries(tree.folders).map(([folderName, folderContent]) => (
          <div key={`folder-${parentPath}${folderName}`}>
            <div 
              className="pl-4 py-1 cursor-pointer flex items-center hover:bg-gray-700"
              style={{ paddingLeft: `${1 + level * 1}rem` }}
              onClick={() => {
                // Toggle folder expansion (in a real implementation)
                console.log(`Toggle folder ${folderName}`);
              }}
            >
              <span className="mr-2">📁</span>
              {folderName}
            </div>
            {renderFileTree(folderContent, level + 1, `${parentPath}${folderName}/`)}
          </div>
        ))}
      </>
    );
  };

  return (
    <div className="w-64 bg-gray-800 text-white overflow-y-auto">
      <div className="p-3 font-bold flex justify-between items-center">
        <span>EXPLORER</span>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-white"
        >
          {expanded ? '▼' : '►'}
        </button>
      </div>
      
      {expanded && (
        <>
          {projectFolder ? (
            <div className="px-3 pb-2 text-sm text-gray-400">{projectFolder.toUpperCase()}</div>
          ) : (
            <div className="px-3 pb-2 text-sm text-gray-400">OPEN EDITORS</div>
          )}
          
          <div>
            {projectFolder ? (
              renderFileTree(fileTree)
            ) : (
              files.map(file => (
                <div 
                  key={file.id}
                  onClick={() => onFileSelect(file.id)}
                  className={`pl-4 py-1 cursor-pointer flex items-center ${file.id === activeFileId ? 'bg-gray-700' : 'hover:bg-gray-700'}`}
                >
                  <span className="mr-2">
                    {file.language === 'javascript' && '📄'}
                    {file.language === 'css' && '🎨'}
                    {file.language === 'html' && '🌐'}
                    {!['javascript', 'css', 'html'].includes(file.language) && '📝'}
                  </span>
                  {file.name}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}