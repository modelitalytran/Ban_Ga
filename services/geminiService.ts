import { GoogleGenAI } from "@google/genai";
import { Product, Order } from "../types";

// Quay lại Google Gemini (Miễn phí)
// Sử dụng model Flash (Bản nhẹ) để tốc độ nhanh và hạn mức cao hơn bản Pro
const GENERATION_MODEL = 'gemini-2.0-flash'; 

const API_KEY = process.env.API_KEY;

const getAI = () => {
    if (!API_KEY) return null;
    return new GoogleGenAI({ apiKey: API_KEY });
};

// Helper: Delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Hàm gọi API có cơ chế thử lại (Retry) khi gặp lỗi 429
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
            
            // Nếu là lỗi 429 (Too Many Requests) hoặc 503 (Server Overloaded)
            if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('503') || msg.includes('Overloaded')) {
                if (i < retries - 1) {
                    const waitTime = 2000 * (i + 1); // Chờ 2s, 4s, 6s...
                    console.warn(`Gemini đang bận (${msg}). Thử lại sau ${waitTime/1000}s...`);
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
    
    if (msg.includes('API_KEY')) return "⚠️ Lỗi API Key. Vui lòng kiểm tra lại biến môi trường.";
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) return "⚠️ AI đang quá tải (429). Vui lòng đợi 30s rồi hỏi lại.";
    
    return `Lỗi AI: ${msg.substring(0, 100)}...`;
};

export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  if (!API_KEY) return "⚠️ Chưa cấu hình API Key.";

  try {
    const ai = getAI();
    if (!ai) throw new Error("Service Init Failed");

    const prompt = `Viết mô tả bán hàng ngắn (dưới 40 từ) cho sản phẩm: ${name} (${category}). Hấp dẫn, không dùng Markdown.`;
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
  if (!API_KEY) return "⚠️ Chưa cấu hình API Key. Vui lòng thêm API_KEY vào Vercel.";

  try {
    const ai = getAI();
    if (!ai) throw new Error("Service Init Failed");
    
    // Tối ưu dữ liệu gửi lên để tránh lỗi quá tải token
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalDebt = orders.reduce((sum, o) => sum + o.debt, 0);
    
    // Chỉ lấy Top 30 sản phẩm để giảm dung lượng prompt
    const productSummary = products.slice(0, 30).map(p => 
      `${p.name}: ${p.stock} con`
    ).join(', ');

    // Chỉ lấy 5 đơn gần nhất
    const recentOrders = orders
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(o => `${o.customerName} (${o.total/1000}k)`)
      .join(', ');

    // Chỉ lấy danh sách nợ > 0
    const debtors = orders
      .filter(o => o.debt > 0)
      .slice(0, 15)
      .map(o => `${o.customerName}: ${o.debt/1000}k`)
      .join('\n');

    const prompt = `
      Bạn là trợ lý ảo trại gà.
      - Doanh thu: ${totalRevenue.toLocaleString('vi-VN')}đ. Nợ: ${totalDebt.toLocaleString('vi-VN')}đ.
      - Kho (Top 30): ${productSummary}
      - Đơn mới: ${recentOrders}
      - Đang nợ: 
      ${debtors}
      
      Câu hỏi: "${query}"
      Trả lời ngắn gọn, tiếng Việt, format Markdown đẹp.
    `;

    const response = await generateContentWithRetry(ai, prompt);
    return response.text || "Xin lỗi, tôi không thể trả lời lúc này.";
  } catch (error: any) {
    return handleGeminiError(error);
  }
};