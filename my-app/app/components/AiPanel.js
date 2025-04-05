import { useState, useRef, useEffect } from 'react';

export default function AiPanel({
  theme,
  toggleAiPanel,
  activeFile,
  editorRef,
  projectFiles,
  updateFileContent
}) {
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  const [isUsingSelection, setIsUsingSelection] = useState(false);
  const [linkedFiles, setLinkedFiles] = useState([]);
  const [isLoadingLinkedFiles, setIsLoadingLinkedFiles] = useState(false);
  const aiChatRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (aiChatRef.current) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // Check for selection changes when panel is focused or interacted with
  useEffect(() => {
    const checkSelectionInterval = setInterval(() => {
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        const selectedText = editorRef.current.getModel().getValueInRange(selection);

        if (selectedText && selectedText.trim() !== '' && selectedText !== selectedCode) {
          setSelectedCode(selectedText);
          setIsUsingSelection(true);

          // Focus the input field for user to type their prompt
          if (inputRef.current) {
            inputRef.current.focus();
          }
        }
      }
    }, 1000);

    return () => clearInterval(checkSelectionInterval);
  }, [editorRef, selectedCode]);

  // Fetch linked files when active file changes
  useEffect(() => {
    if (activeFile?.path) {
      fetchLinkedFiles(activeFile.path);
    }
  }, [activeFile]);

  // Function to fetch linked files from the backend
  const fetchLinkedFiles = async (filePath) => {
    setIsLoadingLinkedFiles(true);
    try {
      const response = await fetch('http://localhost:5000/api/linked-files', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          file_path: filePath
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch linked files: ${response.statusText}`);
      }

      const data = await response.json();
      setLinkedFiles(data.linked_files || []);

      // Add info message about linked files
      if (data.linked_files && data.linked_files.length > 0) {
        setAiMessages(prev => {
          // Check if we already have an info message about linked files
          const hasLinkedFilesInfo = prev.some(msg =>
            msg.role === 'system' && msg.type === 'linked-files-info'
          );

          if (!hasLinkedFilesInfo) {
            return [...prev, {
              role: 'system',
              type: 'linked-files-info',
              content: `Found ${data.linked_files.length} linked ${data.linked_files.length === 1 ? 'file' : 'files'
                } that can be analyzed together with this code.`
            }];
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Error fetching linked files:', error);
    } finally {
      setIsLoadingLinkedFiles(false);
    }
  };

  // Function to apply AI-generated code changes to editor
  const applyAiChangesToEditor = (newCode, filePath = null) => {
    const targetPath = filePath || (activeFile?.path);

    if (!targetPath) return;

    // If the file is the active file, update in editor
    if (activeFile?.path === targetPath && editorRef.current) {
      const selection = editorRef.current.getSelection();

      // Check if there's an active selection
      if (selection && !selection.isEmpty()) {
        // Replace only the selected text
        editorRef.current.executeEdits('ai-assistant', [{
          range: selection,
          text: newCode
        }]);
      } else {
        // If no selection, replace the entire content
        editorRef.current.setValue(newCode);
      }
    }

    // Update file content in the project files array
    updateFileContent(targetPath, newCode);
  };

  // Process AI response to extract file-specific changes
  const processAiFileChanges = (changes) => {
    if (!changes || !Array.isArray(changes)) return [];

    return changes.map(change => {
      // Try to find the matching file in project files
      const targetFile = projectFiles.find(file =>
        file.path === change.filePath ||
        file.name === change.fileName
      );

      return {
        ...change,
        matchedFile: targetFile,
        canApply: !!targetFile
      };
    });
  };

  // Function to generate a comprehensive prompt for the AI
  const generateAiPrompt = () => {
    // Get selected text from editor if available
    const codeContext = selectedCode || (activeFile?.content || '');

    // Prepare linked files data for the prompt
    const linkedFilesContext = linkedFiles.map(file =>
      `File: ${file.import_path} (${file.abs_path})
Preview: ${file.preview}`
    ).join('\n\n');

    // Build the complete prompt with file context
    let fullPrompt = aiInput;

    // Add active file context
    if (activeFile) {
      fullPrompt += `\n\nActive file: ${activeFile.name} (${activeFile.path})`;
    }

    // Add linked files context if available
    if (linkedFiles.length > 0) {
      fullPrompt += `\n\nLinked Files:\n${linkedFilesContext}`;
    }

    // Add code context at the end
    if (codeContext) {
      fullPrompt += `\n\nCode:\n\`\`\`${activeFile?.language || 'javascript'}\n${codeContext}\n\`\`\``;
    }

    return {
      displayPrompt: aiInput, // What to show to the user (simple query)
      fullPrompt: fullPrompt  // Complete context to send to AI API
    };
  };

  // Function to send a message to the AI
  const sendAiMessage = async () => {
    if (!aiInput.trim() && !selectedCode) return;
    if (isAiProcessing) return;

    // Get selected text from editor if available
    const codeContext = selectedCode || (activeFile?.content || '');

    // Create a combined message to display to the user
    const displayMessage = selectedCode
      ? `${aiInput}\n\n\`\`\`\n${selectedCode}\n\`\`\``
      : aiInput;

    // Add user message to the chat with visual indicator of selected code
    const userMessage = {
      role: 'user',
      content: displayMessage,
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setIsAiProcessing(true);

    try {
      // Generate the comprehensive prompt with file context
      const { fullPrompt } = generateAiPrompt();

      // Prepare linked files data
      const linkedFilesData = linkedFiles.map(file => ({
        import_path: file.import_path,
        abs_path: file.abs_path,
        file_name: file.abs_path.split('/').pop() || file.abs_path.split('\\').pop(),
        content: file.preview // In a real implementation, you might want full content
      }));

      // Make the request to your Python API endpoint
      const response = await fetch('http://localhost:8000/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          query: fullPrompt, // Send the full context-aware prompt
          code: codeContext, // Still send the selected code separately
          language: activeFile?.language || 'javascript',
          filename: activeFile?.name || 'untitled',
          linked_files: linkedFilesData, // Include linked files information
          project_structure: projectFiles.map(file => ({
            name: file.name,
            path: file.path,
            language: file.language
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get AI response: ${response.statusText}`);
      }

      const data = await response.json();

      // Extract code blocks
      let codeBlocks = [];
      if (data.code_blocks && Array.isArray(data.code_blocks)) {
        codeBlocks = data.code_blocks;
      } else if (data.codeBlock) {
        codeBlocks = [{ language: activeFile?.language || 'javascript', code: data.codeBlock }];
      }

      // Extract file-specific changes if available
      let fileChanges = [];
      if (data.file_changes && Array.isArray(data.file_changes)) {
        fileChanges = processAiFileChanges(data.file_changes);
      }

      // Add AI response to chat
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        codeBlocks: codeBlocks,
        fileChanges: fileChanges
      }]);

    } catch (error) {
      console.error('AI processing error:', error);
      setAiMessages(prev => [...prev, {
        role: 'assistant',
        content: `Sorry, I encountered an error processing your request: ${error.message}. Please try again.`
      }]);
    } finally {
      setIsAiProcessing(false);
      setSelectedCode('');
      setIsUsingSelection(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAiMessage();
    }
  };

  return (
    <div className={`w-80 ${theme === 'vs-dark' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-800'} border-l border-gray-600 flex flex-col h-full overflow-hidden`}>
      <div className="flex justify-between items-center p-2 border-b border-gray-600">
        <h3 className="font-medium">AI Assistant (Llama 3.3)</h3>
        <button
          onClick={toggleAiPanel}
          className="p-1 hover:bg-gray-700 rounded"
        >
          ✕
        </button>
      </div>

      {/* Status bar for linked files */}
      {isLoadingLinkedFiles ? (
        <div className={`px-3 py-1 text-xs ${theme === 'vs-dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse mr-2"></div>
            Analyzing file dependencies...
          </div>
        </div>
      ) : linkedFiles.length > 0 ? (
        <div className={`px-3 py-1 text-xs ${theme === 'vs-dark' ? 'bg-blue-900' : 'bg-blue-100'}`}>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full ${theme === 'vs-dark' ? 'bg-blue-400' : 'bg-blue-600'} mr-2`}></div>
            {linkedFiles.length} linked {linkedFiles.length === 1 ? 'file' : 'files'} detected
          </div>
        </div>
      ) : null}

      <div
        ref={aiChatRef}
        className="flex-1 p-3 overflow-auto"
      >
        <p className="text-sm mb-4">
          {linkedFiles.length > 0
            ? "Type your prompt. Your query will include the current file and all linked files context automatically!"
            : "Select code in the editor and write your prompt. Selected code will be automatically included!"}
        </p>

        {aiMessages.map((msg, index) => (
          <div
            key={index}
            className={`p-3 rounded-lg mb-3 ${msg.role === 'user'
                ? theme === 'vs-dark' ? 'bg-blue-900' : 'bg-blue-100'
                : msg.role === 'system'
                  ? theme === 'vs-dark' ? 'bg-gray-900' : 'bg-gray-300'
                  : theme === 'vs-dark' ? 'bg-gray-700' : 'bg-gray-200'
              }`}
          >
            <div className="text-xs font-semibold mb-1">
              {msg.role === 'user' ? 'You' : msg.role === 'system' ? 'System' : 'AI Assistant'}
            </div>
            <div className="whitespace-pre-wrap">
              {msg.content}
            </div>

            {/* Render AI's code blocks */}
            {msg.role === 'assistant' && msg.codeBlocks && msg.codeBlocks.length > 0 && (
              <div className="mt-3 space-y-3">
                {msg.codeBlocks.map((block, blockIndex) => (
                  <div key={blockIndex} className="mt-2">
                    <div className={`p-2 rounded ${theme === 'vs-dark' ? 'bg-gray-900' : 'bg-gray-300'} overflow-x-auto`}>
                      <pre className="text-sm"><code>{block.code}</code></pre>
                    </div>
                    <button
                      onClick={() => applyAiChangesToEditor(block.code)}
                      className={`mt-1 text-xs px-2 py-1 rounded ${theme === 'vs-dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                        } text-white`}
                    >
                      Apply to Editor
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Render file-specific changes */}
            {msg.role === 'assistant' && msg.fileChanges && msg.fileChanges.length > 0 && (
              <div className="mt-4">
                <div className="text-xs font-semibold mb-2">Suggested File Changes:</div>
                <div className="space-y-3">
                  {msg.fileChanges.map((change, changeIndex) => (
                    <div
                      key={changeIndex}
                      className={`p-2 rounded border ${theme === 'vs-dark'
                          ? change.canApply ? 'border-green-600 bg-gray-800' : 'border-yellow-600 bg-gray-800'
                          : change.canApply ? 'border-green-500 bg-gray-100' : 'border-yellow-500 bg-gray-100'
                        }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <div className="text-xs font-medium">
                          {change.matchedFile ? change.matchedFile.name : change.fileName || 'Unknown file'}
                        </div>
                        {change.canApply ? (
                          <button
                            onClick={() => applyAiChangesToEditor(change.code, change.matchedFile.path)}
                            className={`text-xs px-2 py-1 rounded ${theme === 'vs-dark' ? 'bg-green-600 hover:bg-green-700' : 'bg-green-500 hover:bg-green-600'
                              } text-white`}
                          >
                            Apply Changes
                          </button>
                        ) : (
                          <span className={`text-xs px-2 py-1 ${theme === 'vs-dark' ? 'text-yellow-400' : 'text-yellow-600'
                            }`}>
                            File not found
                          </span>
                        )}
                      </div>
                      {change.description && (
                        <div className="text-xs mb-1 italic">
                          {change.description}
                        </div>
                      )}
                      <div className={`p-2 mt-1 rounded text-xs overflow-x-auto ${theme === 'vs-dark' ? 'bg-gray-900' : 'bg-gray-300'
                        }`}>
                        <pre><code>{change.code.length > 200
                          ? change.code.substring(0, 200) + '...'
                          : change.code}</code></pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {isAiProcessing && (
          <div className={`p-3 rounded-lg mb-3 ${theme === 'vs-dark' ? 'bg-gray-700' : 'bg-gray-200'}`}>
            <div className="text-xs font-semibold mb-1">AI Assistant</div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '200ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '400ms' }}></div>
            </div>
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-600">
        {isUsingSelection && (
          <div className={`mb-2 px-2 py-1 rounded text-sm ${theme === 'vs-dark' ? 'bg-green-800' : 'bg-green-200'}`}>
            Code selected! Your prompt will include it.
          </div>
        )}
        {linkedFiles.length > 0 && !isUsingSelection && (
          <div className={`mb-2 px-2 py-1 rounded text-sm ${theme === 'vs-dark' ? 'bg-blue-800' : 'bg-blue-200'}`}>
            Context includes {linkedFiles.length} linked {linkedFiles.length === 1 ? 'file' : 'files'}
          </div>
        )}
        <textarea
          ref={inputRef}
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={linkedFiles.length > 0
            ? "Ask about this file and its dependencies..."
            : "Ask a question... (selected code will be included)"}
          className={`w-full p-2 rounded mb-2 ${theme === 'vs-dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'} focus:outline-none resize-y min-h-[80px]`}
          style={{ maxHeight: '150px' }}
        />
        <button
          onClick={sendAiMessage}
          disabled={isAiProcessing || (!aiInput.trim() && !selectedCode)}
          className={`w-full px-3 py-2 rounded ${theme === 'vs-dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} ${(isAiProcessing || (!aiInput.trim() && !selectedCode)) ? 'opacity-50 cursor-not-allowed' : ''} text-white`}
        >
          {isLoadingLinkedFiles ? "Analyzing Files..." : "Send"}
        </button>
      </div>
    </div>
  );
}