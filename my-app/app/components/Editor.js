// components/Editor.js
"use client";
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-white">Loading editor...</div>
});

export default function Editor({ value, language, onChange, theme }) {
  const [mounted, setMounted] = useState(false);

  // Ensure component is mounted before rendering Monaco
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEditorChange = (value) => {
    onChange(value);
  };

  // Editor options to mimic VS Code
  const options = {
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 14,
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    lineNumbers: 'on',
    automaticLayout: true,
    wordWrap: 'on',
  };

  if (!mounted) return null;

  return (
    <div className="flex-1 h-full overflow-hidden">
      <MonacoEditor
        height="100%"
        language={language}
        value={value}
        theme={theme}
        onChange={handleEditorChange}
        options={options}
      />
    </div>
  );
}