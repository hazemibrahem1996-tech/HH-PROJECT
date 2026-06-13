const https = require('https');

exports.handler = async (event, context) => {
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
    const incomingHistory = body.history || [];

    if (!process.env.GROQ_API_KEY) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: "مفتاح Groq API Key غير مضاف في إعدادات Netlify!" })
      };
    }

    const messages = [
      { role: 'system', content: systemPrompt }
    ];

    incomingHistory.forEach(msg => {
      const role = msg.role === 'assistant' || msg.role === 'model' ? 'assistant' : 'user';
      messages.push({ role: role, content: msg.content || "" });
    });

    const postData = JSON.stringify({
      model: 'llama3-8b-8192',
      messages: messages,
      temperature: 0.4
    });

    const apiResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': Bearer ${process.env.GROQ_API_KEY},
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { resolve({ statusCode: res.statusCode, data }); });
      });

      req.on('error', (e) => { reject(e); });
      req.write(postData);
      req.end();
    });

    const resData = JSON.parse(apiResponse.data);

    if (resData.error) {
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: resData.error.message })
      };
    }

    const aiResponse = resData.choices[0].message.content;

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