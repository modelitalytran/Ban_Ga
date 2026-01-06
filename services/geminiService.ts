import { GoogleGenAI } from "@google/genai";
import { Product, Order } from "../types";

// Sử dụng model ổn định cho tác vụ văn bản
const GENERATION_MODEL = 'gemini-3-flash-preview';

// Helper to get AI instance safely
const getAI = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        console.warn("API Key is missing for Gemini AI");
        // Return a dummy instance to prevent crash, calls will fail gracefully later
        return new GoogleGenAI({ apiKey: '' });
    }
    return new GoogleGenAI({ apiKey });
};

export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  if (!process.env.API_KEY) return "Chưa cấu hình API Key cho AI.";

  try {
    const ai = getAI();
    const prompt = `Viết một mô tả ngắn gọn, hấp dẫn (bằng tiếng Việt) cho một giống gia cầm hoặc sản phẩm tên là "${name}" thuộc loại "${category}". Tập trung vào chất lượng thịt, khả năng sinh trưởng hoặc đặc điểm giống. Giữ dưới 40 từ. Không dùng Markdown.`;
    
    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
    });
    
    return response.text || "Không thể tạo mô tả lúc này.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Lỗi kết nối AI.";
  }
};

export const analyzeBusinessData = async (
  query: string, 
  products: Product[], 
  orders: Order[]
): Promise<string> => {
  if (!process.env.API_KEY) return "Hệ thống chưa phát hiện API Key. Vui lòng cấu hình biến môi trường API_KEY.";

  try {
    const ai = getAI();
    
    // 1. Summarize Data for Context (Avoid token limit issues by aggregating)
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalDebt = orders.reduce((sum, o) => sum + o.debt, 0);
    
    const productSummary = products.map(p => 
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
      .join('\n');

    // 2. Build Prompt
    const context = `
      Bạn là trợ lý quản lý trại gà/vịt chuyên nghiệp tên là "Hoàng Trần AI".
      
      DỮ LIỆU TỔNG QUAN:
      - Tổng doanh thu: ${totalRevenue.toLocaleString('vi-VN')} VNĐ
      - Tổng nợ phải thu: ${totalDebt.toLocaleString('vi-VN')} VNĐ
      
      KHO HÀNG:
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
      4. Nếu hỏi mua gì, hãy tư vấn các mặt hàng còn nhiều tồn kho.
      5. Sử dụng định dạng Markdown (in đậm **text**, gạch đầu dòng) để dễ đọc.
    `;

    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: context,
    });

    return response.text || "Tôi không tìm thấy câu trả lời phù hợp.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Xin lỗi, tôi đang gặp sự cố khi phân tích dữ liệu. Hãy thử lại sau.";
  }
};