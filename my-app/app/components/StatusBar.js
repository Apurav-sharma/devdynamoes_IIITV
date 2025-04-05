// components/StatusBar.js
export default function StatusBar({ language, theme, filePath }) {
  // Format the file path for display
  const formattedPath = filePath ? filePath.replace(/^[^/]+\//, '') : '';
  
  return (
    <div className={`h-6 px-4 flex items-center justify-between text-xs ${theme === 'vs-dark' ? 'bg-blue-600 text-white' : 'bg-blue-400 text-white'}`}>
      <div>Line: 1, Column: 1</div>
      <div className="flex-1 mx-4 truncate">
        {formattedPath && <span className="opacity-70">{formattedPath}</span>}
      </div>
      <div className="capitalize">{language}</div>
      <div>UTF-8</div>
      <div>Spaces: 2</div>
    </div>
  );
}