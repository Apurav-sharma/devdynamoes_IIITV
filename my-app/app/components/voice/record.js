'use client';

import { useEffect, useRef, useState } from 'react';

export default function VoiceAssistant({ editorRef }) {
    const [transcript, setTranscript] = useState('');
    const [listening, setListening] = useState(false);
    const [lastCommand, setLastCommand] = useState('');
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

    const handleVoiceCommand = (text) => {
        // Convert to lowercase for easier command matching
        const command = text.toLowerCase();

        // Set last executed command
        setLastCommand(command);
        console.log('Command received:', command);

        // Editor navigation commands
        if (command.includes('scroll down')) {
            scrollEditor('down');
            speakText('Scrolling down');
        }
        else if (command.includes('scroll up')) {
            scrollEditor('up');
            speakText('Scrolling up');
        }
        // Delete commands
        else if (command.includes('delete line') || command.includes('remove line')) {
            deleteLine();
            speakText('Deleting current line');
        }
        else if (command.includes('delete selection') || command.includes('remove selection')) {
            deleteSelection();
            speakText('Deleting selection');
        }
        // LLM interaction
        else if (command.includes('ask llm') || command.includes('ask ai')) {
            const query = command.replace('ask llm', '').replace('ask ai', '').trim();
            console.log('AI Query:', query);
            if (query) {
                askLLM(query);
                speakText(`Asking AI: ${query}`);
            } else {
                speakText('Please specify what to ask the AI');
            }
        }
        // Feedback for unrecognized commands
        else {
            speakText(`Command not recognized: ${command}`);
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

    const askLLM = async (query) => {
        try {
            console.log('Asking LLM:', query);

            // This is a placeholder for the actual implementation
            // In a real implementation, you would call your LLM API here

            // Mock response for demonstration
            const mockResponse = `Response to: "${query}"`;

            // Insert the response at cursor position
            insertTextAtCursor(mockResponse);
            speakText('AI response inserted');
        } catch (err) {
            console.error('Error calling LLM:', err);
            speakText('Error communicating with AI');
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
                        "scroll up/down", "delete line", "delete selection", "ask ai [question]"
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
        </div>
    );
}