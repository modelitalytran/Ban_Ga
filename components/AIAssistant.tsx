import React, { useState, useRef, useEffect } from 'react';
import { Product, Order } from '../types';
import { analyzeBusinessData } from '../services/geminiService';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
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
    { role: 'assistant', content: 'Xin chào! Tôi là trợ lý AI của cửa hàng. Bạn cần biết thông tin gì về doanh thu, tồn kho hay xu hướng bán hàng hôm nay?' }
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

    const answer = await analyzeBusinessData(userMsg, products, orders);

    setIsLoading(false);
    setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center gap-3">
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
            <Sparkles size={20} />
        </div>
        <div>
            <h3 className="font-bold">Trợ lý Kinh doanh AI</h3>
            <p className="text-xs text-blue-100 opacity-90">Powered by Gemini 3 Flash</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-600'}`}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 border border-gray-100 rounded-tl-none'
            }`}>
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          </div>
        ))}
        {isLoading && (
            <div className="flex gap-3">
                 <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <Bot size={16} />
                </div>
                <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin text-blue-600"/>
                    <span className="text-sm text-gray-500">Đang phân tích dữ liệu...</span>
                </div>
            </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100">
        <div className="relative flex items-center gap-2">
            <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Hỏi về doanh thu, sản phẩm bán chạy..."
                className="w-full bg-gray-100 border-0 rounded-xl px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none text-gray-800 placeholder-gray-400"
            />
            <button 
                onClick={handleSend}
                disabled={isLoading || !query.trim()}
                className="absolute right-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
            >
                <Send size={18} />
            </button>
        </div>
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {['Doanh thu hôm nay thế nào?', 'Sản phẩm nào sắp hết?', 'Top 3 bán chạy nhất'].map(suggestion => (
                <button 
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="whitespace-nowrap px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-xs text-gray-600 transition-colors"
                >
                    {suggestion}
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
