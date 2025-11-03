
import React, { useRef, useEffect } from 'react';
import { Chat } from '@google/genai';
import { ChatMessage } from '../types';
import { createChatSession } from '../services/geminiService';
import { Loader } from './icons/Loader';
import { SendIcon } from './icons/SendIcon';
import { useAppContext } from '../context/AppContext';

const Chatbot: React.FC = () => {
  const { appState, setAppState } = useAppContext();
  const { messages, input, isLoading } = appState.chatbot;

  const setState = (updates: Partial<typeof appState.chatbot>) => {
    setAppState(prev => ({ ...prev, chatbot: { ...prev.chatbot, ...updates } }));
  };

  const setMessages = (newMessages: ChatMessage[]) => {
    setState({ messages: newMessages });
  };
  
  const setInput = (newInput: string) => {
    setState({ input: newInput });
  }

  const chatRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat session only if it hasn't been already
    if (!chatRef.current) {
        chatRef.current = createChatSession();
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatRef.current) return;

    const userMessage: ChatMessage = { role: 'user', text: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setState({ isLoading: true });

    try {
      const result = await chatRef.current.sendMessage({ message: input });
      const modelMessage: ChatMessage = { role: 'model', text: result.text };
      setMessages([...newMessages, modelMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = { role: 'model', text: 'Sorry, I encountered an error. Please try again.' };
      setMessages([...newMessages, errorMessage]);
    } finally {
      setState({ isLoading: false });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSend();
    }
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
              <p className="whitespace-pre-wrap">{msg.text}</p>
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
      <div className="p-4 border-t border-gray-700 flex items-center gap-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Ask me anything..."
          className="flex-grow p-3 bg-gray-700 rounded-lg border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          disabled={isLoading}
        />
        <button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
};

export default Chatbot;
