import { Product, Order } from "../types";

// CHUYỂN ĐỔI SANG OPENAI (ChatGPT)
// Sử dụng model gpt-4o-mini: Nhanh, rẻ và thông minh
const MODEL = 'gpt-4o-mini';
const API_URL = 'https://api.openai.com/v1/chat/completions';

// Lấy API Key từ biến môi trường (Cấu hình trên Vercel: API_KEY = sk-proj-...)
const API_KEY = process.env.API_KEY;

// Helper: Delay function
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Hàm gọi OpenAI API với cơ chế Retry
const callOpenAI = async (messages: Array<{ role: string, content: string }>, retries = 3) => {
    if (!API_KEY) throw new Error("API_KEY_MISSING");

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${API_KEY}`
                },
                body: JSON.stringify({
                    model: MODEL,
                    messages: messages,
                    temperature: 0.7,
                    max_tokens: 1500
                })
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const status = response.status;
                const errorMsg = errData.error?.message || `HTTP error ${status}`;

                // Nếu lỗi 429 (Too Many Requests) hoặc 5xx (Server Error) -> Thử lại
                if ((status === 429 || status >= 500) && i < retries - 1) {
                    const waitTime = 2000 * (i + 1);
                    console.warn(`⚠️ OpenAI bận (${status}). Thử lại sau ${waitTime}ms...`);
                    await delay(waitTime);
                    continue;
                }
                
                throw new Error(errorMsg);
            }

            const data = await response.json();
            return data.choices?.[0]?.message?.content || "";

        } catch (error: any) {
            // Nếu đã hết lượt thử thì ném lỗi ra ngoài
            if (i === retries - 1) throw error;
        }
    }
    return "";
};

// Helper xử lý lỗi OpenAI hiển thị ra màn hình
const handleAIError = (error: any): string => {
    console.error("OpenAI API Error:", error);
    const msg = typeof error === 'string' ? error : (error.message || JSON.stringify(error));
    
    if (msg.includes('API_KEY_MISSING')) {
        return "⚠️ Chưa có API Key. Vui lòng vào Vercel > Settings > Environment Variables để điền Key OpenAI.";
    }
    if (msg.includes('invalid_api_key') || msg.includes('401')) {
        return "⚠️ API Key ChatGPT không hợp lệ. Vui lòng kiểm tra lại.";
    }
    if (msg.includes('insufficient_quota') || msg.includes('429')) {
        return "⚠️ Tài khoản OpenAI đã hết hạn mức (Quota) hoặc đang bị giới hạn tần suất.";
    }
    
    return `Lỗi ChatGPT: ${msg.substring(0, 100)}...`;
};

export const generateProductDescription = async (name: string, category: string): Promise<string> => {
  try {
    const prompt = `Viết một mô tả ngắn gọn, hấp dẫn (bằng tiếng Việt) cho một giống gia cầm hoặc sản phẩm tên là "${name}" thuộc loại "${category}". Tập trung vào chất lượng thịt, khả năng sinh trưởng hoặc đặc điểm giống. Giữ dưới 40 từ. Không dùng Markdown.`;
    
    const content = await callOpenAI([
        { role: "system", content: "Bạn là chuyên gia về chăn nuôi gia cầm." },
        { role: "user", content: prompt }
    ]);
    
    return content || "Không thể tạo mô tả lúc này.";
  } catch (error: any) {
    return handleAIError(error);
  }
};

export const analyzeBusinessData = async (
  query: string, 
  products: Product[], 
  orders: Order[]
): Promise<string> => {
  try {
    // 1. Summarize Data for Context
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalDebt = orders.reduce((sum, o) => sum + o.debt, 0);
    
    // Limit product summary
    const productSummary = products.slice(0, 50).map(p => 
      `- ${p.name} (${p.category}): Giá ${p.price/1000}k, Tồn ${p.stock}`
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
    const systemPrompt = `
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
      
      YÊU CẦU TRẢ LỜI:
      1. Trả lời bằng tiếng Việt tự nhiên, thân thiện.
      2. Dựa chính xác vào dữ liệu trên. Nếu không có dữ liệu, hãy nói không biết.
      3. Nếu hỏi về nợ, hãy liệt kê tên và số tiền.
      4. Sử dụng định dạng Markdown (in đậm **text**, gạch đầu dòng) để dễ đọc.
    `;

    const content = await callOpenAI([
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
    ]);

    return content || "Tôi không tìm thấy câu trả lời phù hợp.";
  } catch (error: any) {
    return handleAIError(error);
  }
};