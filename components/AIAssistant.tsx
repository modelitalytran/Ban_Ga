import React, { useState, useRef, useEffect } from 'react';
import { Product, Order } from '../types';
import { analyzeBusinessData } from '../services/geminiService';
import { Send, Bot, User, Sparkles, Loader2, Trash2, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIAssistantProps {
  products: Product[];
  orders: Order[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ products, orders }) => {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Xin chào! Tôi là **Hoang Trần AI**. Tôi có thể giúp gì cho việc kinh doanh hôm nay? \n\n*Ví dụ: "Hôm nay bán được bao nhiêu?", "Ai đang nợ tiền?", "Kho còn bao nhiêu gà Minh Dư?"*' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!query.trim()) return;

    const userMsg = query;
    setQuery('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    // Call Gemini Service
    const answer = await analyzeBusinessData(userMsg, products, orders);

    setIsLoading(false);
    setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
  };

  const handleClearChat = () => {
    if(window.confirm("Bạn muốn xóa toàn bộ đoạn chat này?")) {
        setMessages([{ role: 'assistant', content: 'Đã xóa lịch sử. Chúng ta bắt đầu lại nhé!' }]);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex justify-between items-center">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles size={20} />
            </div>
            <div>
                <h3 className="font-bold">Trợ lý AI</h3>
                <p className="text-xs text-blue-100 opacity-90">Phân tích dữ liệu bán hàng</p>
            </div>
        </div>
        <button 
            onClick={handleClearChat}
            className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/80 hover:text-white"
            title="Xóa đoạn chat"
        >
            <RefreshCw size={18} />
        </button>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-gray-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 border shadow-sm ${msg.role === 'user' ? 'bg-white border-gray-200 text-gray-600' : 'bg-blue-100 border-blue-200 text-blue-600'}`}>
              {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            <div className={`max-w-[85%] lg:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-sm' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm'
            }`}>
              {/* Render Markdown content properly */}
              <ReactMarkdown 
                components={{
                    ul: ({node, ...props}) => <ul className="list-disc pl-4 mt-2 space-y-1" {...props} />,
                    ol: ({node, ...props}) => <ol className="list-decimal pl-4 mt-2 space-y-1" {...props} />,
                    li: ({node, ...props}) => <li className="pl-1" {...props} />,
                    strong: ({node, ...props}) => <span className="font-bold" {...props} />,
                    p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />
                }}
              >
                  {msg.content}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        
        {isLoading && (
            <div className="flex gap-3 animate-in fade-in duration-300">
                 <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200">
                    <Bot size={18} />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-3">
                    <Loader2 size={18} className="animate-spin text-blue-600"/>
                    <span className="text-sm text-gray-500 font-medium">Đang suy nghĩ...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100 z-10">
        {/* Suggestions */}
        {messages.length < 3 && (
            <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar mb-1">
                {['Tổng doanh thu tháng này?', 'Khách nào đang nợ nhiều nhất?', 'Gà CP còn bao nhiêu con?', 'Tư vấn nhập hàng'].map(suggestion => (
                    <button 
                        key={suggestion}
                        onClick={() => setQuery(suggestion)}
                        className="whitespace-nowrap px-3 py-1.5 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-200 rounded-full text-xs font-medium text-gray-600 hover:text-blue-600 transition-colors"
                    >
                        {suggestion}
                    </button>
                ))}
            </div>
        )}

        <div className="relative flex items-center gap-2">
            <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3.5 pr-12 focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all outline-none text-gray-800 placeholder-gray-400 shadow-sm"
                autoFocus
            />
            <button 
                onClick={handleSend}
                disabled={isLoading || !query.trim()}
                className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-sm"
            >
                <Send size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;