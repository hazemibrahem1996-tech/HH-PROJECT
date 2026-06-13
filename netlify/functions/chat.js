const { Groq } = require('@groq/groq-sdk');

exports.handler = async (event, context) => {
  // تفعيل الـ CORS لتجنب مشاكل الاتصال بين الفرونت والباك
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    const body = JSON.parse(event.body);
    const systemPrompt = body.systemPrompt || "أنت خبير متخصص في إدارة المشاريع الإنشائية.";
    const userMessage = body.message;
    const incomingHistory = body.history || [];

    // التأكد من وجود المفتاح السري داخل إعدادات Netlify
    if (!process.env.GROQ_API_KEY) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: "Groq API Key is missing in Netlify environment variables." })
      };
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // إعادة هيكلة المحادثة بما يتوافق مع صيغة Groq (system -> user -> assistant)
    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    // إضافة التاريخ المرسل من الواجهة
    incomingHistory.forEach(msg => {
      // تحويل الأدومة إذا كانت الواجهة تبعتها بصيغة مختلفة لتناسب Groq
      const role = msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user';
      messages.push({ role: role, content: msg.content });
    });

    // إرسال الطلب النهائي لـ Groq بالنموذج السريع Llama 3
    const chatCompletion = await groq.chat.completions.create({
      messages: messages,
      model: 'llama3-8b-8192',
      temperature: 0.5,
      max_tokens: 2048
    });

    const aiResponse = chatCompletion.choices[0].message.content;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reply: aiResponse })
    };

  } catch (error) {
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: error.message })
    };
  }
};
