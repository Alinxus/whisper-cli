'use client';
import { useState, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  PaperAirplaneIcon, 
  SparklesIcon, 
  CodeBracketIcon,
  DocumentTextIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { aiApi } from '../../lib/api';
import { toast } from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { clsx } from 'clsx';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isLoading?: boolean;
}

const exampleQueries = [
  {
    title: "Analyze code for security vulnerabilities",
    query: "Please analyze the following JavaScript code for security vulnerabilities:\n\n```javascript\napp.post('/login', (req, res) => {\n  const { username, password } = req.body;\n  const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;\n  db.query(query, (err, results) => {\n    if (results.length > 0) {\n      res.json({ success: true, user: results[0] });\n    } else {\n      res.json({ success: false });\n    }\n  });\n});\n```",
    icon: CodeBracketIcon,
    color: 'bg-blue-50 text-blue-600'
  },
  {
    title: "Review Docker configuration",
    query: "Can you review this Dockerfile for security best practices?\n\n```dockerfile\nFROM node:latest\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 3000\nCMD [\"npm\", \"start\"]\n```",
    icon: DocumentTextIcon,
    color: 'bg-green-50 text-green-600'
  },
  {
    title: "Explain security fix",
    query: "I have a SQL injection vulnerability in my code. Can you explain how to fix it securely using parameterized queries in Node.js?",
    icon: BoltIcon,
    color: 'bg-purple-50 text-purple-600'
  }
];

const modelOptions = [
  { value: 'gpt-4o', label: 'GPT-4o (OpenAI)', description: 'Best for complex analysis' },
  { value: 'claude-3.5-sonnet-20241022', label: 'Claude 3.5 Sonnet', description: 'Great for security analysis' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro', description: 'Good for code review' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
];

export default function AIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const aiMutation = useMutation({
    mutationFn: aiApi.queryAI,
    onSuccess: (data, variables) => {
      setMessages(prev => prev.map(msg => 
        msg.id === variables.prompt ? 
          { ...msg, isLoading: false } : 
          msg
      ).concat({
        id: Date.now().toString(),
        content: data.response,
        role: 'assistant',
        timestamp: new Date()
      }));
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'AI query failed');
      setMessages(prev => prev.filter(msg => !msg.isLoading));
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || aiMutation.isPending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: 'user',
      timestamp: new Date()
    };

    const loadingMessage: Message = {
      id: inputMessage,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isLoading: true
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    
    aiMutation.mutate({
      model: selectedModel,
      prompt: inputMessage,
      temperature: 0.1,
      maxTokens: 4000,
      systemPrompt: 'You are a security expert AI assistant. Provide detailed, accurate security analysis and recommendations. Focus on practical solutions and best practices.'
    });

    setInputMessage('');
  };

  const handleExampleClick = (query: string) => {
    setInputMessage(query);
    textareaRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-200px)]">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <SparklesIcon className="h-8 w-8 text-indigo-600 mr-3" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI Security Assistant</h1>
              <p className="text-gray-600">Get expert security analysis and recommendations</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {modelOptions.map(model => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Messages Container */}
        <div className="flex-1 flex flex-col bg-white rounded-lg shadow-sm border">
          {messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center max-w-2xl">
                <SparklesIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Welcome to AI Security Assistant
                </h3>
                <p className="text-gray-600 mb-8">
                  Ask me anything about code security, vulnerabilities, or best practices. 
                  I can analyze code, review configurations, and provide security recommendations.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {exampleQueries.map((example, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(example.query)}
                      className="p-4 text-left border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                    >
                      <div className={clsx(
                        'inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3',
                        example.color
                      )}>
                        <example.icon className="h-5 w-5" />
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{example.title}</h4>
                      <p className="text-sm text-gray-500 line-clamp-2">
                        {example.query.split('\n')[0]}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={clsx(
                    'flex',
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={clsx(
                      'max-w-3xl px-4 py-3 rounded-lg',
                      message.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    )}
                  >
                    {message.isLoading ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        <span className="text-sm">Analyzing...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>
                    )}
                    <div className={clsx(
                      'text-xs mt-2',
                      message.role === 'user' ? 'text-indigo-200' : 'text-gray-500'
                    )}>
                      {format(message.timestamp, 'HH:mm')}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Input Form */}
          <div className="border-t p-4">
            <form onSubmit={handleSubmit} className="flex space-x-4">
              <div className="flex-1">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me about code security, vulnerabilities, or best practices..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  rows={3}
                  disabled={aiMutation.isPending}
                />
              </div>
              <button
                type="submit"
                disabled={!inputMessage.trim() || aiMutation.isPending}
                className="self-end px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
                <span>Send</span>
              </button>
            </form>
            
            <div className="mt-2 text-xs text-gray-500">
              Press Enter to send, Shift+Enter for new line. Using {modelOptions.find(m => m.value === selectedModel)?.label}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
