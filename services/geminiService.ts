import { GoogleGenAI } from "@google/genai";
import { Product, Order } from "../types";

// Nâng cấp lên model Gemini 3 Flash Preview (Mới nhất, tối ưu cho tác vụ nhanh)
const GENERATION_MODEL = 'gemini-3-flash-preview';

// Lấy API Key từ biến môi trường
const API_KEY = process.env.API_KEY;

// Helper to get AI instance safely
const getAI = () => {
    if (!API_KEY) {
        return null;
    }
    return new GoogleGenAI({ apiKey: API_KEY });
};

// Helper: Delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Hàm gọi API có cơ chế tự thử lại mạnh mẽ (Retry Logic)
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
            
            // Check lỗi 429 (Quá tải/Hết quota) hoặc 503 (Server lỗi)
            if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('503') || msg.includes('Overloaded')) {
                if (i < retries - 1) {
                    // Chiến thuật chờ tăng dần: 3s, 6s, 9s, 12s...
                    const waitTime = 3000 * (i + 1); 
                    console.warn(`⚠️ AI đang bận (Lần ${i + 1}/${retries}). Đợi ${waitTime/1000}s để thử lại...`);
                    await delay(waitTime);
                    continue; 
                }
            }
            // Nếu lỗi khác (như sai Key) hoặc đã hết lượt thử
            throw error;
        }
    }
};

// Helper xử lý thông báo lỗi hiển thị ra màn hình
const handleGeminiError = (error: any): string => {
    console.error("Gemini API Error:", error);
    const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
    
    if (msg.includes('API_KEY_INVALID') || msg.includes('400')) {
        return "⚠️ API Key không hợp lệ. Vui lòng kiểm tra cấu hình biến môi trường.";
    }
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) {
        return "⚠️ Lỗi quyền truy cập (403). Key có thể bị hạn chế hoặc chưa bật API.";
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        return "⚠️ Hệ thống đang quá tải liên tục. Vui lòng đợi 1-2 phút rồi thử lại.";
    }
    
    return `Lỗi AI: ${msg.substring(0, 100)}...`;
};

export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  if (!API_KEY) return "⚠️ Chưa có API Key. Vui lòng cấu hình biến môi trường API_KEY.";

  try {
    const ai = getAI();
    if (!ai) throw new Error("Không thể khởi tạo AI Service");

    const prompt = `Viết một mô tả ngắn gọn, hấp dẫn (bằng tiếng Việt) cho một giống gia cầm hoặc sản phẩm tên là "${name}" thuộc loại "${category}". Tập trung vào chất lượng thịt, khả năng sinh trưởng hoặc đặc điểm giống. Giữ dưới 40 từ. Không dùng Markdown.`;
    
    const response = await generateContentWithRetry(ai, prompt);
    
    return response.text || "Không thể tạo mô tả lúc này.";
  } catch (error: any) {
    return handleGeminiError(error);
  }
};

export const analyzeBusinessData = async (
  query: string, 
  products: Product[], 
  orders: Order[]
): Promise<string> => {
  if (!API_KEY) return "⚠️ Hệ thống chưa có API Key. Vui lòng cấu hình biến môi trường API_KEY.";

  try {
    const ai = getAI();
    if (!ai) throw new Error("Không thể khởi tạo AI Service");
    
    // 1. Summarize Data for Context
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalDebt = orders.reduce((sum, o) => sum + o.debt, 0);
    
    // Limit product summary
    const productSummary = products.slice(0, 50).map(p => 
      `- ${p.name} (${p.category}): Giá ${p.price/1000}k, Tồn ${p.stock}, ${p.stock <= (p.minStockThreshold || 10) ? 'SẮP HẾT' : 'Ổn'}`
    ).join('\n');

    // Get recent orders
    const recentOrders = orders
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(o => `- ${new Date(o.date).toLocaleDateString('vi-VN')}: ${o.customerName} mua ${o.total/1000}k (${o.saleType})`)
      .join('\n');

    const debtors = orders
      .filter(o => o.debt > 0)
      .map(o => `- ${o.customerName}: Nợ ${o.debt/1000}k`)
      .slice(0, 20)
      .join('\n');

    // 2. Build Prompt
    const context = `
      Bạn là trợ lý quản lý trại gà/vịt chuyên nghiệp tên là "Hoang Trần AI".
      
      DỮ LIỆU TỔNG QUAN:
      - Tổng doanh thu: ${totalRevenue.toLocaleString('vi-VN')} VNĐ
      - Tổng nợ phải thu: ${totalDebt.toLocaleString('vi-VN')} VNĐ
      
      KHO HÀNG (Top 50):
      ${productSummary}
      
      GIAO DỊCH GẦN ĐÂY:
      ${recentOrders}
      
      DANH SÁCH NỢ:
      ${debtors || "Không có ai nợ."}
      
      CÂU HỎI NGƯỜI DÙNG: "${query}"
      
      YÊU CẦU TRẢ LỜI:
      1. Trả lời bằng tiếng Việt tự nhiên, thân thiện.
      2. Dựa chính xác vào dữ liệu trên. Nếu không có dữ liệu, hãy nói không biết.
      3. Nếu hỏi về nợ, hãy liệt kê tên và số tiền.
      4. Sử dụng định dạng Markdown (in đậm **text**, gạch đầu dòng) để dễ đọc.
    `;

    const response = await generateContentWithRetry(ai, context);

    return response.text || "Tôi không tìm thấy câu trả lời phù hợp.";
  } catch (error: any) {
    return handleGeminiError(error);
  }
};