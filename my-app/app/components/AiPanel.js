import { useState, useRef, useEffect } from 'react';

export default function AiPanel({ 
  theme, 
  toggleAiPanel, 
  activeFile, 
  editorRef
}) {
  const [aiInput, setAiInput] = useState('');
  const [aiMessages, setAiMessages] = useState([]);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [selectedCode, setSelectedCode] = useState('');
  const [isUsingSelection, setIsUsingSelection] = useState(false);
  const aiChatRef = useRef(null);
  const inputRef = useRef(null);
  // console.log(editorRef, "AiPanel editorRef");

  // Scroll to bottom when messages change
  useEffect(() => {
    if (aiChatRef.current) {
      aiChatRef.current.scrollTop = aiChatRef.current.scrollHeight;
    }
  }, [aiMessages]);

  // Check for selection changes when panel is focused or interacted with
  useEffect(() => {
    // Set up interval to check for selections
    // console.log('Setting up selection interval...', editorRef.current);
    const checkSelectionInterval = setInterval(() => {
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        // console.log('Current selection:', selection);
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
    }, 1000); // Check every half second
    
    return () => clearInterval(checkSelectionInterval);
  }, [editorRef, selectedCode]);

  // Function to apply AI-generated code changes to editor
  const applyAiChangesToEditor = (newCode) => {
    if (editorRef.current) {
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
      // Make the request to your Python API endpoint
      const response = await fetch('http://localhost:8000/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          query: aiInput, // Send just the user's query
          code: codeContext, // Send the selected code separately
          language: activeFile?.language || 'javascript',
          filename: activeFile?.name || 'untitled'
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
      
      // Add AI response to chat
      setAiMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response,
        codeBlocks: codeBlocks
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
      <div 
        ref={aiChatRef}
        className="flex-1 p-3 overflow-auto"
      >
        <p className="text-sm mb-4">Select code in the editor and write your prompt. Selected code will be automatically included!</p>
        {aiMessages.map((msg, index) => (
          <div 
            key={index} 
            className={`p-3 rounded-lg mb-3 ${
              msg.role === 'user' 
                ? theme === 'vs-dark' ? 'bg-blue-900' : 'bg-blue-100' 
                : theme === 'vs-dark' ? 'bg-gray-700' : 'bg-gray-200'
            }`}
          >
            <div className="text-xs font-semibold mb-1">
              {msg.role === 'user' ? 'You' : 'AI Assistant'}
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
                      className={`mt-1 text-xs px-2 py-1 rounded ${
                        theme === 'vs-dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                      } text-white`}
                    >
                      Apply to Editor
                    </button>
                  </div>
                ))}
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
        <textarea
          ref={inputRef}
          value={aiInput}
          onChange={(e) => setAiInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask a question... (selected code will be automatically included)"
          className={`w-full p-2 rounded mb-2 ${theme === 'vs-dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-800'} focus:outline-none resize-y min-h-[80px]`}
          style={{ maxHeight: '150px' }}
        />
        <button 
          onClick={sendAiMessage}
          disabled={isAiProcessing || (!aiInput.trim() && !selectedCode)}
          className={`w-full px-3 py-2 rounded ${theme === 'vs-dark' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'} ${(isAiProcessing || (!aiInput.trim() && !selectedCode)) ? 'opacity-50 cursor-not-allowed' : ''} text-white`}
        >
          Send
        </button>
      </div>
    </div>
  );
}