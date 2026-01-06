import { GoogleGenAI } from "@google/genai";
import { Product, Order } from "../types";

// Sử dụng model mới nhất theo khuyến nghị của Google để có hiệu năng tốt nhất
// Model này thường xử lý nhanh hơn và hạn mức ổn định hơn bản 2.0 cũ
const GENERATION_MODEL = 'gemini-3-flash-preview';

const API_KEY = process.env.API_KEY;

const getAI = () => {
    if (!API_KEY) return null;
    return new GoogleGenAI({ apiKey: API_KEY });
};

// Helper: Delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Hàm gọi API với thuật toán Exponential Backoff (Lùi theo hàm mũ)
// Giúp vượt qua lỗi 429 một cách kiên nhẫn và thông minh hơn
const generateContentWithRetry = async (ai: any, prompt: string, retries = 5) => {
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
                    // Thuật toán Backoff: (2^i * 1000) + Jitter (ngẫu nhiên)
                    // VD: Lần 1 chờ ~2s, Lần 2 chờ ~4s, Lần 3 chờ ~8s, Lần 4 chờ ~16s
                    const jitter = Math.random() * 1000;
                    const waitTime = Math.pow(2, i + 1) * 1000 + jitter;
                    
                    console.warn(`⚠️ AI đang bận (Lần ${i + 1}/${retries}). Đợi ${Math.round(waitTime/1000)}s...`);
                    await delay(waitTime);
                    continue; 
                }
            }
            // Nếu lỗi khác hoặc đã hết lượt thử
            throw error;
        }
    }
};

const handleGeminiError = (error: any): string => {
    console.error("Gemini API Error:", error);
    const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
    
    if (msg.includes('API_KEY')) return "⚠️ Lỗi API Key. Vui lòng kiểm tra cấu hình.";
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        return "⚠️ Hệ thống đang quá tải (429). Vui lòng đợi 1 phút và thử lại.";
    }
    
    return `Lỗi AI: ${msg.substring(0, 80)}...`;
};

export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  if (!API_KEY) return "⚠️ Chưa có API Key.";

  try {
    const ai = getAI();
    if (!ai) throw new Error("Init Failed");

    // Prompt tối giản nhất có thể để tiết kiệm Token
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
  if (!API_KEY) return "⚠️ Chưa có API Key.";

  try {
    const ai = getAI();
    if (!ai) throw new Error("Init Failed");
    
    // 1. TÍNH TOÁN SỐ LIỆU (Client-side)
    // Giảm tải cho AI bằng cách tính trước các con số
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalDebt = orders.reduce((sum, o) => sum + o.debt, 0);
    const totalOrders = orders.length;

    // 2. TỐI ƯU DỮ LIỆU GỬI ĐI (Context Pruning)
    // Chỉ gửi top 20 sản phẩm quan trọng để tránh hết quota Token
    const productContext = products
        .filter(p => p.stock > 0) // Chỉ lấy hàng còn trong kho
        .slice(0, 20)
        .map(p => `${p.name}: ${p.stock}`)
        .join(', ');

    // Chỉ lấy 5 đơn hàng mới nhất
    const orderContext = orders
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(o => `${o.customerName} (${(o.total/1000).toFixed(0)}k)`)
      .join(', ');

    // Chỉ lấy top 10 người nợ nhiều nhất
    const debtContext = orders
      .filter(o => o.debt > 0)
      .sort((a, b) => b.debt - a.debt)
      .slice(0, 10)
      .map(o => `${o.customerName}: ${(o.debt/1000).toFixed(0)}k`)
      .join(', ');

    // 3. XÂY DỰNG PROMPT NGẮN GỌN
    const prompt = `
      Bạn là trợ lý trại gà. Dữ liệu hiện tại:
      - Tổng thu: ${totalRevenue.toLocaleString('vi-VN')}đ.
      - Tổng nợ: ${totalDebt.toLocaleString('vi-VN')}đ.
      - Tổng đơn: ${totalOrders}.
      - Kho: ${productContext}
      - Đơn mới: ${orderContext}
      - Đang nợ: ${debtContext}
      
      Câu hỏi: "${query}"
      
      Trả lời ngắn gọn (dưới 100 từ), thân thiện, dùng Markdown.
    `;

    const response = await generateContentWithRetry(ai, prompt);
    return response.text || "Tôi không tìm thấy câu trả lời.";
  } catch (error: any) {
    return handleGeminiError(error);
  }
};