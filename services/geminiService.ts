import { GoogleGenAI } from "@google/genai";
import { Product, Order } from "../types";

// Sử dụng model Gemini 2.0 Flash (Bản ổn định)
const GENERATION_MODEL = 'gemini-2.0-flash';

// Lấy API Key từ biến môi trường (Cấu hình trong Vercel Settings hoặc .env)
const API_KEY = process.env.API_KEY;

// Helper to get AI instance safely
const getAI = () => {
    if (!API_KEY) {
        return null;
    }
    return new GoogleGenAI({ apiKey: API_KEY });
};

// Helper xử lý thông báo lỗi thân thiện
const handleGeminiError = (error: any): string => {
    console.error("Gemini API Error:", error);
    const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
    
    if (msg.includes('API_KEY_INVALID') || msg.includes('400')) {
        return "⚠️ API Key không hợp lệ. Vui lòng kiểm tra lại biến môi trường API_KEY trên Vercel.";
    }
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('leaked')) {
        return "⚠️ API Key bị từ chối hoặc bị lộ. Vui lòng tạo Key mới và cập nhật vào biến môi trường trên Vercel.";
    }
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) {
        return "⚠️ Hệ thống đang bận (429). Vui lòng thử lại sau vài giây.";
    }
    
    return `Lỗi kết nối AI: ${msg.substring(0, 100)}...`;
};

export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  if (!API_KEY) return "⚠️ Chưa có API Key. Vui lòng vào Vercel > Settings > Environment Variables để thêm API_KEY.";

  try {
    const ai = getAI();
    if (!ai) throw new Error("Không thể khởi tạo AI Service");

    const prompt = `Viết một mô tả ngắn gọn, hấp dẫn (bằng tiếng Việt) cho một giống gia cầm hoặc sản phẩm tên là "${name}" thuộc loại "${category}". Tập trung vào chất lượng thịt, khả năng sinh trưởng hoặc đặc điểm giống. Giữ dưới 40 từ. Không dùng Markdown.`;
    
    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
    });
    
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
  if (!API_KEY) return "⚠️ Hệ thống chưa có API Key. Vui lòng cấu hình biến môi trường API_KEY trên Vercel.";

  try {
    const ai = getAI();
    if (!ai) throw new Error("Không thể khởi tạo AI Service");
    
    // 1. Summarize Data for Context
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalDebt = orders.reduce((sum, o) => sum + o.debt, 0);
    
    // Limit product summary to avoid context overflow if list is huge
    const productSummary = products.slice(0, 50).map(p => 
      `- ${p.name} (${p.category}): Giá ${p.price/1000}k, Tồn ${p.stock}, ${p.stock <= (p.minStockThreshold || 10) ? 'SẮP HẾT' : 'Ổn'}`
    ).join('\n');

    // Get recent orders (last 5)
    const recentOrders = orders
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5)
      .map(o => `- ${new Date(o.date).toLocaleDateString('vi-VN')}: ${o.customerName} mua ${o.total/1000}k (${o.saleType})`)
      .join('\n');

    const debtors = orders
      .filter(o => o.debt > 0)
      .map(o => `- ${o.customerName}: Nợ ${o.debt/1000}k`)
      .slice(0, 20) // Limit debtors list
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

    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: context,
    });

    return response.text || "Tôi không tìm thấy câu trả lời phù hợp.";
  } catch (error: any) {
    return handleGeminiError(error);
  }
};