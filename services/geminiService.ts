import { GoogleGenAI } from "@google/genai";
import { Product, Order } from "../types";

// Sử dụng model mới nhất theo khuyến nghị của Google
const GENERATION_MODEL = 'gemini-3-flash-preview';

const API_KEY = process.env.API_KEY;

const getAI = () => {
    // Check kỹ hơn để báo lỗi chính xác
    if (!API_KEY || API_KEY.trim() === '' || API_KEY.includes('API_KEY')) {
        console.error("❌ API_KEY is missing or invalid. Check Vercel Settings.");
        return null;
    }
    return new GoogleGenAI({ apiKey: API_KEY });
};

// Helper: Delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Hàm gọi API với thuật toán Exponential Backoff
const generateContentWithRetry = async (ai: any, prompt: string, retries = 3) => {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await ai.models.generateContent({
                model: GENERATION_MODEL,
                contents: prompt,
            });
            return response;
        } catch (error: any) {
            const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
            
            // Check các lỗi quá tải (429, 503, Overloaded)
            if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('503') || msg.includes('Overloaded')) {
                if (i < retries - 1) {
                    const jitter = Math.random() * 1000;
                    const waitTime = Math.pow(2, i + 1) * 1000 + jitter;
                    console.warn(`⚠️ AI đang bận (Lần ${i + 1}/${retries}). Đợi ${Math.round(waitTime/1000)}s...`);
                    await delay(waitTime);
                    continue; 
                }
            }
            throw error;
        }
    }
};

const handleGeminiError = (error: any): string => {
    console.error("Gemini API Error:", error);
    const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
    
    if (msg.includes('API_KEY') || msg.includes('Init Failed')) {
        return "⚠️ Lỗi: Chưa cấu hình API Key trên Vercel. Vui lòng vào Settings > Environment Variables để thêm.";
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        return "⚠️ Hệ thống AI đang quá tải (429). Vui lòng đợi 1-2 phút rồi thử lại.";
    }
    
    return `Lỗi AI: ${msg.substring(0, 80)}...`;
};

export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) throw new Error("Init Failed: API Key missing");

    const prompt = `Viết mô tả bán hàng hấp dẫn (dưới 30 từ) cho: ${name} (${category}). Tiếng Việt.`;
    
    const response = await generateContentWithRetry(ai, prompt);
    return response.text || "Không có mô tả.";
  } catch (error: any) {
    return handleGeminiError(error);
  }
};

export const analyzeBusinessData = async (
  query: string, 
  products: Product[], 
  orders: Order[]
): Promise<string> => {
  try {
    const ai = getAI();
    if (!ai) throw new Error("Init Failed: API Key missing");
    
    // 1. TÍNH TOÁN SỐ LIỆU
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalDebt = orders.reduce((sum, o) => sum + o.debt, 0);
    const totalOrders = orders.length;

    // 2. TỐI ƯU DỮ LIỆU (Giới hạn context)
    const productContext = products
        .filter(p => p.stock > 0) 
        .slice(0, 15) // Giảm xuống 15 để tiết kiệm token
        .map(p => `${p.name}: ${p.stock}`)
        .join(', ');

    const orderContext = orders
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(o => `${o.customerName} (${(o.total/1000).toFixed(0)}k)`)
      .join(', ');

    const debtContext = orders
      .filter(o => o.debt > 0)
      .sort((a, b) => b.debt - a.debt)
      .slice(0, 8) // Giảm xuống 8
      .map(o => `${o.customerName}: ${(o.debt/1000).toFixed(0)}k`)
      .join(', ');

    // 3. PROMPT
    const prompt = `
      Bạn là trợ lý trại gà. Dữ liệu:
      - Thu: ${totalRevenue.toLocaleString('vi-VN')}đ. Nợ: ${totalDebt.toLocaleString('vi-VN')}đ.
      - Kho: ${productContext}
      - Đơn mới: ${orderContext}
      - Nợ: ${debtContext}
      
      Hỏi: "${query}"
      Đáp ngắn gọn (dưới 100 từ), tiếng Việt, Markdown.
    `;

    const response = await generateContentWithRetry(ai, prompt);
    return response.text || "Tôi không tìm thấy câu trả lời.";
  } catch (error: any) {
    return handleGeminiError(error);
  }
};