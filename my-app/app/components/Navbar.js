// components/Navbar.js
import { useState } from 'react';

export default function Navbar({
  filename,
  toggleTheme,
  theme,
  openFile,
  openFolder,
  saveFile,
  createNewFile,
  projectFolder,
  showAiPanel,
  runFile,
  preVersion,
  postVersion
}) {
  const [showFileMenu, setShowFileMenu] = useState(false);

  return (
    <div className={`flex h-10 items-center px-4 ${theme === 'vs-dark' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'} border-b border-gray-700`}>
      <div className="flex space-x-2">
        <div className="relative">
          <button
            className="px-2 py-1 hover:bg-gray-700 rounded cursor-pointer"
            onClick={() => setShowFileMenu(!showFileMenu)}
            onBlur={() => setTimeout(() => setShowFileMenu(false), 100)}
          >
            File
          </button>
          {showFileMenu && (
            <div
              className={`absolute left-0 top-full w-48 shadow-lg ${theme === 'vs-dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
                } rounded-md z-10 border border-gray-700`}
            >
              <div className="py-1">
                <button onClick={() => { createNewFile(); setShowFileMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-700">New File</button>
                <button onClick={() => { openFile(); setShowFileMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-700">Open File...</button>
                <button onClick={() => { openFolder(); setShowFileMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-700">Open Folder...</button>
                <button onClick={() => { saveFile(); setShowFileMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-700">Save</button>
              </div>
            </div>
          )}
        </div>
        <button className="px-2 py-1 hover:bg-gray-700 rounded cursor-pointer">Edit</button>
        <button className="px-2 py-1 hover:bg-gray-700 rounded cursor-pointer">View</button>
        <button onClick={showAiPanel} className="px-2 py-1 hover:bg-gray-700 rounded cursor-pointer flex items-center">
          <span>AI Assistant</span>
        </button>
        <button onClick={runFile} className="px-2 py-1 hover:bg-gray-700 cursor-pointer">Save Version</button>
        <button onClick={preVersion} className="text-white bg-gray-700 px-2 py-1 rounded mx-1">⬅ Prev</button>
        <button onClick={postVersion} className="text-white bg-gray-700 px-2 py-1 rounded mx-1">Next ➡</button>
      </div>
      <div className="flex-1 flex justify-center">
        <span className="font-medium truncate max-w-md">
          {projectFolder && <span className="text-gray-400">{projectFolder} / </span>}
          {filename || "untitled"}
        </span>
      </div>
      <div>
        <button
          onClick={toggleTheme}
          className={`px-3 py-1 rounded ${theme === 'vs-dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'}`}
          title={theme === 'vs-dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {theme === 'vs-dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
}