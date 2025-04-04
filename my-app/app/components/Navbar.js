// components/Navbar.js
export default function Navbar({ 
  filename, 
  toggleTheme, 
  theme, 
  openFile, 
  openFolder, 
  saveFile, 
  createNewFile,
  projectFolder
}) {
  return (
    <div className={`flex h-10 items-center px-4 ${theme === 'vs-dark' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'}`}>
      <div className="flex space-x-2">
        <div className="relative group">
          <div className="px-2 py-1 hover:bg-gray-700 cursor-pointer">File</div>
          <div className={`absolute left-0 top-full w-48 shadow-lg ${theme === 'vs-dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} rounded-md hidden group-hover:block z-10`}>
            <div className="py-1">
              <button onClick={createNewFile} className="w-full text-left px-4 py-2 hover:bg-gray-700">New File</button>
              <button onClick={openFile} className="w-full text-left px-4 py-2 hover:bg-gray-700">Open File...</button>
              <button onClick={openFolder} className="w-full text-left px-4 py-2 hover:bg-gray-700">Open Folder...</button>
              <button onClick={saveFile} className="w-full text-left px-4 py-2 hover:bg-gray-700">Save</button>
            </div>
          </div>
        </div>
        <div className="px-2 hover:bg-gray-700 cursor-pointer">Edit</div>
        <div className="px-2 hover:bg-gray-700 cursor-pointer">View</div>
        <div className="px-2 hover:bg-gray-700 cursor-pointer">Run</div>
      </div>
      <div className="flex-1 flex justify-center">
        <span className="font-medium">
          {projectFolder && <span className="text-gray-400">{projectFolder} / </span>}
          {filename}
        </span>
      </div>
      <div>
        <button 
          onClick={toggleTheme}
          className={`px-3 py-1 rounded ${theme === 'vs-dark' ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-300 hover:bg-gray-400'}`}
        >
          {theme === 'vs-dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </div>
  );
}