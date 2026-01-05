import { GoogleGenAI } from "@google/genai";
import { Product, Order } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const GENERATION_MODEL = 'gemini-3-flash-preview';

export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  try {
    const prompt = `Viết một mô tả ngắn gọn, hấp dẫn (bằng tiếng Việt) cho một giống gia cầm hoặc sản phẩm tên là "${name}" thuộc loại "${category}". Tập trung vào chất lượng thịt, khả năng sinh trưởng hoặc đặc điểm giống. Giữ dưới 30 từ. Không dùng Markdown.`;
    
    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: prompt,
    });
    
    return response.text || "Không thể tạo mô tả lúc này.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Lỗi khi kết nối với AI.";
  }
};

export const analyzeBusinessData = async (
  query: string, 
  products: Product[], 
  orders: Order[]
): Promise<string> => {
  try {
    // Prepare context
    const context = `
      Bạn là trợ lý ảo chuyên nghiệp cho một trang trại kinh doanh gia cầm (Gà, Vịt, Bồ câu).
      
      Dữ liệu kho hiện tại (JSON):
      ${JSON.stringify(products.map(p => ({ name: p.name, stock: p.stock, price: p.price, category: p.category })))}
      
      Lịch sử bán hàng (JSON):
      ${JSON.stringify(orders.map(o => ({ 
        date: o.date, 
        total: o.total, 
        customer: o.customerName,
        type: o.saleType,
        debt: o.debt,
        items: o.items.map(i => ({ name: i.name, qty: i.quantity })) 
      })))}
      
      Câu hỏi người dùng: "${query}"
      
      Hướng dẫn:
      - Trả lời dựa trên dữ liệu.
      - Nếu hỏi về doanh thu, tính tổng tiền.
      - Nếu hỏi về nợ, hãy liệt kê những khách đang nợ (debt > 0).
      - Nếu hỏi về hàng hóa, tư vấn dựa trên loại gia cầm (Gà, Vịt...).
      - Trả lời tiếng Việt, ngắn gọn, chuyên nghiệp.
      - Dùng Markdown để định dạng danh sách đẹp mắt.
    `;

    const response = await ai.models.generateContent({
      model: GENERATION_MODEL,
      contents: context,
    });

    return response.text || "Tôi không tìm thấy câu trả lời.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Xin lỗi, tôi đang gặp sự cố khi phân tích dữ liệu.";
  }
};
