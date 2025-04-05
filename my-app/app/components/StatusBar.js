// components/StatusBar.js
export default function StatusBar({ language, theme }) {
    return (
      <div className={`h-6 px-4 flex items-center justify-between text-xs ${theme === 'vs-dark' ? 'bg-blue-600 text-white' : 'bg-blue-400 text-white'}`}>
        <div>Line: 1, Column: 1</div>
        <div className="capitalize">{language}</div>
        <div>UTF-8</div>
        <div>Spaces: 2</div>
      </div>
    );
  }