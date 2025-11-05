import React, { useRef, useEffect } from 'react';
import { Chat } from '@google/genai';
import { ChatMessage } from '../types';
import { createChatSession } from '../services/geminiService';
import { Loader } from './icons/Loader';
import { SendIcon } from './icons/SendIcon';
import { useAppContext } from '../context/AppContext';
import { PaperclipIcon } from './icons/PaperclipIcon';
import { FileIcon } from './icons/FileIcon';
import { CloseIcon } from './icons/CloseIcon';

// Helper to convert a File to a Gemini API GenerativePart
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const Chatbot: React.FC = () => {
  const { appState, setAppState } = useAppContext();
  const { messages, input, isLoading, stagedFile } = appState.chatbot;

  const setState = (updates: Partial<typeof appState.chatbot>) => {
    setAppState(prev => ({ ...prev, chatbot: { ...prev.chatbot, ...updates } }));
  };

  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!chatRef.current) {
      chatRef.current = createChatSession();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if ((!input.trim() && !stagedFile) || !chatRef.current) return;

    setState({ isLoading: true });
    
    const currentInput = input;
    const currentFile = stagedFile;

    // Clear UI immediately
    setState({ input: '', stagedFile: null });

    const apiParts: any[] = [];
    let userMessage: ChatMessage = { role: 'user', text: currentInput };

    if (currentInput.trim()) {
        apiParts.push({ text: currentInput });
    }

    if (currentFile) {
        const dataUrl = await new Promise<string>(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(currentFile);
        });
        
        const filePart = await fileToGenerativePart(currentFile);
        apiParts.push(filePart);
        
        userMessage.file = { name: currentFile.name, type: currentFile.type, dataUrl };
    }
    
    const newMessages = [...messages, userMessage];
    setState({ messages: newMessages });

    try {
      const result = await chatRef.current.sendMessage({ parts: apiParts });
      const modelMessage: ChatMessage = { role: 'model', text: result.text };
      setState({ messages: [...newMessages, modelMessage] });
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = { role: 'model', text: 'Sorry, I encountered an error processing your request. Please try again.' };
      setState({ messages: [...newMessages, errorMessage] });
    } finally {
      setState({ isLoading: false });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setState({ stagedFile: e.target.files[0] });
    }
     // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };

  const renderFileInMessage = (file: ChatMessage['file']) => {
    if (!file) return null;

    if (file.type.startsWith('image/')) {
        return <img src={file.dataUrl} alt={file.name} className="max-w-xs rounded-lg mt-2" />;
    }
    
    return (
        <div className="mt-2 flex items-center gap-2 bg-gray-600/50 p-2 rounded-lg">
            <FileIcon className="w-6 h-6 text-gray-300 flex-shrink-0" />
            <span className="text-sm truncate" title={file.name}>{file.name}</span>
        </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-150px)] max-w-4xl mx-auto bg-gray-800 rounded-lg border border-gray-700 shadow-xl">
      <div className="p-4 border-b border-gray-700 text-center">
        <h2 className="text-2xl font-bold text-white">Gemini Chat</h2>
      </div>
      <div className="flex-grow p-6 overflow-y-auto space-y-4">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-lg p-3 rounded-lg ${msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-200'}`}>
              {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
              {msg.file && renderFileInMessage(msg.file)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="max-w-lg p-3 rounded-lg bg-gray-700 text-gray-200">
              <Loader />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-gray-700">
         {stagedFile && (
            <div className="mb-2 flex justify-between items-center bg-gray-700 p-2 rounded-lg">
                <div className="flex items-center gap-2 overflow-hidden">
                    <FileIcon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm truncate">{stagedFile.name}</span>
                </div>
                <button 
                    onClick={() => setState({ stagedFile: null })} 
                    className="p-1 rounded-full hover:bg-gray-600"
                    aria-label="Remove file"
                >
                    <CloseIcon className="w-4 h-4" />
                </button>
            </div>
        )}
        <div className="flex items-center gap-4">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} hidden />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="bg-gray-700 text-white p-3 rounded-lg hover:bg-gray-600 disabled:opacity-50"
                aria-label="Attach file"
            >
                <PaperclipIcon />
            </button>
            <input
                type="text"
                value={input}
                onChange={(e) => setState({ input: e.target.value })}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything, with or without a file..."
                className="flex-grow p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                disabled={isLoading}
            />
            <button
                onClick={handleSend}
                disabled={isLoading || (!input.trim() && !stagedFile)}
                className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
                <SendIcon />
            </button>
        </div>
      </div>
    </div>
  );
};

export default Chatbot;