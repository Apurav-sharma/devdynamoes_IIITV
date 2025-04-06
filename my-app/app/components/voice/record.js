'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';

export default function VoiceAssistant({ editorRef }) {
    const [transcript, setTranscript] = useState('');
    const [listening, setListening] = useState(false);
    const [lastCommand, setLastCommand] = useState('');
    const [aiResponse, setAiResponse] = useState(null);
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const recognitionRef = useRef(null);

    // Initialize SpeechRecognition once
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const SpeechRecognition =
                window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                const recognition = new SpeechRecognition();
                recognition.lang = 'en-US';
                recognition.interimResults = false;
                recognition.continuous = false;

                recognition.onresult = (event) => {
                    const spokenText = event.results[event.results.length - 1][0].transcript;
                    setTranscript(spokenText);

                    // Process commands
                    handleVoiceCommand(spokenText);
                };

                recognition.onend = () => {
                    if (listening) recognition.start(); // restart if still listening
                };

                recognition.onerror = (event) => {
                    console.error('Speech recognition error:', event.error);
                    setListening(false);
                };

                recognitionRef.current = recognition;
            }
        }

        return () => {
            recognitionRef.current?.stop();
        };
    }, [listening]);

    const handleVoiceCommand = async (text) => {
        // Convert to lowercase for easier command matching
        const cmd = text.toLowerCase();

        // Set last executed command
        setLastCommand(cmd);
        console.log('Command received:', cmd);

        try {
            const res = await axios.post('http://127.0.0.1:5000/match-command', {
                text: cmd
            });

            console.log('API response:', res.data);

            // Get the matched command and action from the response
            const { matched_command: command, action, similarity } = res.data;

            console.log(`Matched command: ${command}, Action: ${action}, Similarity: ${similarity}`);

            // If command is not recognized
            if (action === 'unknown' || command === 'command not recognized') {
                speakText(`Command not recognized: ${cmd}`);
                return;
            }

            // Handle commands based on action type
            switch (action) {
                case 'scroll_down':
                    scrollEditor('down');
                    speakText('Scrolling down');
                    break;

                case 'scroll_up':
                    scrollEditor('up');
                    speakText('Scrolling up');
                    break;

                case 'delete_line':
                    deleteLine();
                    speakText('Deleting current line');
                    break;

                case 'delete_selection':
                    deleteSelection();
                    speakText('Deleting selection');
                    break;

                case 'find_function':
                    const functionName = cmd.replace(/find\s+/gi, '');

                    if (functionName) {
                        findFunctionByName(functionName);
                        speakText(`Finding function: ${functionName}`);
                    } else {
                        speakText('Please specify function name to find');
                    }
                    break;

                case 'copy_from_line':
                    const match = cmd.match(/copy from line\s+(\d+)\s+to\s+(\d+)/i);
                    if (match && match.length === 3) {
                        const startLine = parseInt(match[1]);
                        const endLine = parseInt(match[2]);
                        copyCodeBetweenLines(startLine, endLine);
                        speakText(`Copying code from line ${startLine} to ${endLine}`);
                    } else {
                        speakText('Please specify line numbers correctly');
                    }
                    break;

                case 'copy_all':
                    copy_allcode();
                    speakText('Copying all code');
                    break;

                case 'format_code':
                    formatDocument();
                    speakText('Formatting code');
                    break;

                case 'toggle_comment':
                    toggleComment();
                    speakText('Toggling comment');
                    break;

                case 'ask_llm':
                    const query = cmd.replace(/ask (llm|ai)/i, '').trim();
                    if (query) {
                        askLLM(query);
                        speakText(`Asking AI: ${query}`);
                    } else {
                        speakText('Please specify what to ask the AI');
                    }
                    break;

                default:
                    speakText(`Command not recognized: ${cmd}`);
                    break;
            }
        } catch (error) {
            console.error('Error calling command matching API:', error);
            speakText('Error processing command');
        }
    };

    // Helper function to safely get the editor instance
    const getEditorInstance = () => {
        if (!editorRef || !editorRef.current) return null;

        // Try different ways of accessing the editor based on how it's stored
        return editorRef.current.editor ||
            editorRef.current._editor ||
            editorRef.current.getEditor?.() ||
            editorRef.current;
    };

    // Editor control functions
    const scrollEditor = (direction) => {
        const editorInstance = getEditorInstance();
        if (!editorInstance) {
            console.error('Editor instance not available');
            speakText('Editor not accessible');
            return;
        }

        const scrollAmount = direction === 'down' ? 100 : -100;

        try {
            const currentScrollTop = editorInstance.getScrollTop();
            editorInstance.setScrollTop(currentScrollTop + scrollAmount);
        } catch (err) {
            console.error('Error scrolling editor:', err);
            speakText('Could not scroll editor');
        }
    };

    const deleteLine = () => {
        const editorInstance = getEditorInstance();
        if (!editorInstance) return;

        try {
            // Execute Monaco's delete line command
            editorInstance.getAction('editor.action.deleteLines')?.run();
        } catch (err) {
            console.error('Error deleting line:', err);
            speakText('Could not delete line');
        }
    };

    const deleteSelection = () => {
        const editorInstance = getEditorInstance();
        if (!editorInstance) return;

        try {
            // Get the current selection
            const selection = editorInstance.getSelection();

            // If there's a valid selection, delete it
            if (selection && !selection.isEmpty()) {
                editorInstance.executeEdits('voice-assistant', [
                    { range: selection, text: '' }
                ]);
            } else {
                speakText('No text selected');
            }
        } catch (err) {
            console.error('Error deleting selection:', err);
            speakText('Could not delete selection');
        }
    };

    // Find function by name
    const findFunctionByName = (searchWord) => {
        const editorInstance = getEditorInstance();
        console.log(editorInstance);
        if (!editorInstance) return [];

        try {
            // Get model and search for the word
            const model = editorInstance.getModel();
            console.log(model);
            if (!model) {
                speakText('Editor model not available');
                return [];
            }

            const text = model.getValue();
            const lines = text.split('\n');
            console.log(lines);

            const input = searchWord;
            const filtered = input.replace(/\s+/g, ''); // Removes all spaces
            console.log(filtered); // Output: "copycodebetweenlines"

            // Create a regex pattern to find the word
            // Using word boundaries to match whole words only
            const pattern = new RegExp(`\\b${searchWord}\\b`, 'i');

            const result = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (pattern.test(line)) {
                    result.push(i + 1); // Store the line number
                    console.log(`Found "${searchWord}" at line ${i + 1}`);
                }
            }

            if (result.length > 0) {
                // Only move cursor to the first instance found
                editorInstance.setPosition({ lineNumber: result[0], column: 1 });
                editorInstance.revealLineInCenter(result[0]);
                speakText(`Found "${searchWord}" at ${result.length} locations`);
                return result;
            } else {
                console.log("not found");
                speakText(`"${searchWord}" not found`);
                return [];
            }
        } catch (err) {
            console.error('Error finding word:', err);
            speakText('Could not search for word');
            return [];
        }
    };
    // Copy code between lines
    const copyCodeBetweenLines = (startLine, endLine) => {
        const editorInstance = getEditorInstance();
        if (!editorInstance) return;

        try {
            const model = editorInstance.getModel();
            if (!model) {
                speakText('Editor model not available');
                return;
            }

            // Validate line numbers
            const lineCount = model.getLineCount();
            if (startLine < 1 || endLine > lineCount || startLine > endLine) {
                speakText(`Invalid line range. Document has ${lineCount} lines`);
                return;
            }

            // Create a selection for the specified lines
            const selection = {
                startLineNumber: startLine,
                startColumn: 1,
                endLineNumber: endLine,
                endColumn: model.getLineMaxColumn(endLine)
            };

            // Get the text from the selection
            const selectedText = model.getValueInRange(selection);

            // Copy to clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(selectedText)
                    .then(() => {
                        // Highlight the copied text
                        editorInstance.setSelection(selection);
                        editorInstance.revealRangeInCenter(selection);
                        speakText(`Code from lines ${startLine} to ${endLine} copied to clipboard`);
                    })
                    .catch(err => {
                        console.error('Failed to copy to clipboard:', err);
                        speakText('Failed to copy to clipboard');
                    });
            } else {
                speakText('Clipboard access not available');
            }
        } catch (err) {
            console.error('Error copying code:', err);
            speakText('Could not copy the specified lines');
        }
    };

    const copy_allcode = () => {
        const editorInstance = getEditorInstance();
        if (!editorInstance) return;

        try {
            const model = editorInstance.getModel();
            if (!model) {
                speakText('Editor model not available');
                return;
            }

            // Validate line numbers
            const lineCount = model.getLineCount();
            // Create a selection for the specified lines
            const selection = {
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: lineCount,
                endColumn: model.getLineMaxColumn(lineCount)
            };

            // Get the text from the selection
            const selectedText = model.getValueInRange(selection);

            // Copy to clipboard
            if (navigator.clipboard) {
                navigator.clipboard.writeText(selectedText)
                    .then(() => {
                        // Highlight the copied text
                        editorInstance.setSelection(selection);
                        editorInstance.revealRangeInCenter(selection);
                        speakText(`Code from lines ${1} to ${lineCount} copied to clipboard`);
                    })
                    .catch(err => {
                        console.error('Failed to copy to clipboard:', err);
                        speakText('Failed to copy to clipboard');
                    });
            } else {
                speakText('Clipboard access not available');
            }
        } catch (err) {
            console.error('Error copying code:', err);
            speakText('Could not copy the specified lines');
        }
    };

    // Format document
    const formatDocument = () => {
        const editorInstance = getEditorInstance();
        if (!editorInstance) return;

        try {
            // Execute Monaco's format document command
            editorInstance.getAction('editor.action.formatDocument')?.run();
        } catch (err) {
            console.error('Error formatting document:', err);
            speakText('Could not format document');
        }
    };

    // Toggle comment
    const toggleComment = () => {
        const editorInstance = getEditorInstance();
        if (!editorInstance) return;

        try {
            // Execute Monaco's toggle comment command
            editorInstance.getAction('editor.action.commentLine')?.run();
        } catch (err) {
            console.error('Error toggling comment:', err);
            speakText('Could not toggle comment');
        }
    };

    const askLLM = async (query) => {
        try {
            console.log('Asking LLM:', query);
            setIsAiProcessing(true);
            setAiResponse(null);

            const editorInstance = getEditorInstance();
            if (!editorInstance) {
                speakText('Editor not accessible');
                setIsAiProcessing(false);
                return;
            }

            const model = editorInstance.getModel();
            if (!model) {
                speakText('Editor model not available');
                setIsAiProcessing(false);
                return;
            }

            // Get all code from the editor
            const lineCount = model.getLineCount();
            const selection = {
                startLineNumber: 1,
                startColumn: 1,
                endLineNumber: lineCount,
                endColumn: model.getLineMaxColumn(lineCount)
            };

            // Get the text from the selection
            const selectedText = model.getValueInRange(selection);

            // Call the LLM API
            const response = await fetch('http://localhost:8000/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    query: query,
                    code: selectedText,
                    language: model.getLanguageId() || 'javascript',
                    filename: 'untitled'
                }),
            });

            console.log('AI response status:', response.status);

            if (!response.ok) {
                throw new Error(`Failed to get AI response: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('AI response data:', data);

            // Update state with AI response
            setAiResponse({
                response: data.response,
                codeBlocks: data.code_blocks || (data.codeBlock ? [{
                    language: model.getLanguageId() || 'javascript',
                    code: data.codeBlock
                }] : [])
            });

            speakText('AI response received');
        } catch (err) {
            console.error('Error calling LLM:', err);
            speakText('Error communicating with AI');
            setAiResponse({
                response: `Error: ${err.message}`,
                codeBlocks: []
            });
        } finally {
            setIsAiProcessing(false);
        }
    };

    // Apply AI code to editor
    const applyAiCodeToEditor = (code) => {
        const editorInstance = getEditorInstance();
        if (!editorInstance) return;

        try {
            const selection = editorInstance.getSelection();

            // Check if there's an active selection
            if (selection && !selection.isEmpty()) {
                // Replace only the selected text
                editorInstance.executeEdits('voice-assistant', [{
                    range: selection,
                    text: code
                }]);
            } else {
                // If no selection, replace the entire content
                editorInstance.setValue(code);
            }

            speakText('Code applied to editor');
        } catch (err) {
            console.error('Error applying code:', err);
            speakText('Could not apply code to editor');
        }
    };

    const insertTextAtCursor = (text) => {
        const editorInstance = getEditorInstance();
        if (!editorInstance) return;

        try {
            const selection = editorInstance.getSelection();
            editorInstance.executeEdits('voice-assistant', [
                {
                    range: selection,
                    text,
                    forceMoveMarkers: true
                }
            ]);
        } catch (err) {
            console.error('Error inserting text:', err);
            speakText('Could not insert text');
        }
    };

    const startListening = () => {
        if (!recognitionRef.current) {
            speakText('Speech recognition not available in this browser');
            return;
        }

        setListening(true);
        recognitionRef.current.start();
        speakText('Voice commands activated');
    };

    const stopListening = () => {
        if (!recognitionRef.current) return;

        setListening(false);
        recognitionRef.current.stop();
        speakText('Voice commands deactivated');
    };

    const speakText = (text) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        const synth = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(text);

        // Load voices
        let voices = synth.getVoices();
        if (!voices.length) {
            window.speechSynthesis.onvoiceschanged = () => {
                voices = synth.getVoices();
                const selectedVoice =
                    voices.find((v) => v.name.includes('Google UK English Male')) || voices[0];
                if (selectedVoice) utterance.voice = selectedVoice;
                synth.speak(utterance);
            };
        } else {
            const selectedVoice =
                voices.find((v) => v.name.includes('Google UK English Male')) || voices[0];
            if (selectedVoice) utterance.voice = selectedVoice;
            synth.speak(utterance);
        }
    };

    // Clear the AI response
    const clearAiResponse = () => {
        setAiResponse(null);
    };

    return (
        <div className="p-4 border-t border-gray-700">
            <h2 className="text-xl font-bold mb-2">🎤 Voice Assistant</h2>
            <div className="flex space-x-2">
                <button
                    onClick={listening ? stopListening : startListening}
                    className={`px-4 py-2 rounded ${listening
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-blue-500 hover:bg-blue-600'} text-white`}
                >
                    {listening ? 'Stop Listening' : 'Start Talking'}
                </button>
                <div className="flex-1 p-2 bg-gray-800 rounded text-sm">
                    <p className="text-gray-400">Available commands:</p>
                    <p className="text-xs text-gray-300">
                        "scroll up/down", "delete line", "delete selection", "ask ai [question]",
                        "find function [name]", "copy from line [number] to [number]", "format code", "toggle comment"
                    </p>
                </div>
            </div>
            <div className="mt-4">
                <p className="text-sm text-gray-400">Last heard:</p>
                <p className="font-mono text-sm bg-gray-800 p-2 rounded mt-1 max-h-20 overflow-y-auto">
                    {transcript || "Nothing yet"}
                </p>
                {lastCommand && (
                    <p className="text-xs mt-1 text-gray-400">
                        Last command: <span className="text-blue-300">{lastCommand}</span>
                    </p>
                )}
            </div>

            {/* AI Response Section */}
            {(aiResponse || isAiProcessing) && (
                <div className="mt-4 border border-gray-700 rounded p-3">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-md font-semibold">AI Response</h3>
                        {aiResponse && (
                            <button
                                onClick={clearAiResponse}
                                className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    {isAiProcessing ? (
                        <div className="flex items-center space-x-2 h-10">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '200ms' }}></div>
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '400ms' }}></div>
                            <span className="text-gray-400 ml-2">Processing...</span>
                        </div>
                    ) : aiResponse && (
                        <div className="max-h-80 overflow-y-auto">
                            {/* Text Response */}
                            <div className="whitespace-pre-wrap mb-3 text-sm">
                                {aiResponse.response}
                            </div>

                            {/* Code Blocks */}
                            {aiResponse.codeBlocks.length > 0 && (
                                <div className="space-y-3">
                                    {aiResponse.codeBlocks.map((block, index) => (
                                        <div key={index} className="bg-gray-900 rounded overflow-hidden">
                                            <div className="flex justify-between items-center px-3 py-1 bg-gray-800">
                                                <span className="text-xs text-gray-400">{block.language || 'code'}</span>
                                                <button
                                                    onClick={() => applyAiCodeToEditor(block.code)}
                                                    className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded"
                                                >
                                                    Apply Code
                                                </button>
                                            </div>
                                            <pre className="p-3 text-sm overflow-x-auto">
                                                <code>{block.code}</code>
                                            </pre>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}