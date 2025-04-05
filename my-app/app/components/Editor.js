"use client";
import { useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import Monaco Editor to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-white">Loading editor...</div>
});

const Editor = forwardRef(({ value, language, onChange, theme, editorRef }, ref) => {
  const [mounted, setMounted] = useState(false);
  const [editorInstance, setEditorInstance] = useState(null);

  // Ensure component is mounted before rendering Monaco
  useEffect(() => {
    setMounted(true);
  }, []);

  // Expose the editor instance through the ref
  useImperativeHandle(ref, () => ({
    editor: editorInstance,
    getEditor: () => editorInstance
  }));

  // Handler for editor mount to store the editor instance
  const handleEditorDidMount = (editor, monaco) => {
    setEditorInstance(editor);
    
    // Also store in the passed ref for backward compatibility
    if (editorRef) {
      editorRef.current = {
        editor: editor,
        _editor: editor // For compatibility with existing code
      };
    }
  };

  const handleEditorChange = (value) => {
    onChange(value);
  };

  const handleMountchange = (editor) => {
    editorRef.current = editor; // Save editor reference for getting selections
  }

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
        onMount={handleEditorDidMount}
      />
    </div>
  );
});

// Add display name for better debugging
Editor.displayName = 'Editor';

export default Editor;