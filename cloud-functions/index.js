exports.main = async (event, context) => {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';

  // 你的域名白名单
  const allowedOrigins = [
    'https://mindmate-accessible-cheetah-d3cd5e45c3732.webapps.tcloudbase.com',
    'https://accessible-cheetah-d3cd5e45c3732-1523529632.ap-shanghai.app.tcloudbase.com',
    'http://localhost:8080',
    'http://127.0.0.1:8080',
    'null'
  ];

  // 校验请求来源
  if (origin && !allowedOrigins.includes(origin)) {
    return {
      statusCode: 403,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized: origin not allowed' })
    };
  }

  // CORS 配置
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // 处理 OPTIONS 预检请求
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  // 解析请求体
  let body;
  try {
    body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch (e) {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { messages, temperature = 0.7, max_tokens = 400 } = body || {};
  const BASE_URL = process.env.UPSTREAM_BASE_URL;
  const API_KEY = process.env.UPSTREAM_API_KEY;
  const MODEL = process.env.UPSTREAM_MODEL || 'deepseek-chat';

  if (!BASE_URL || !API_KEY) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: '缺少环境变量' }) };
  }

  // 请求上游大模型
  try {
    const response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({ model: MODEL, messages, temperature, max_tokens }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('上游报错:', response.status, errText);
      return {
        statusCode: response.status,
        headers: corsHeaders,
        body: JSON.stringify({ error: `上游服务返回 ${response.status}`, details: errText })
      };
    }

    const data = await response.json();
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify(data) };

  } catch (err) {
    console.error('请求发送失败:', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: '请求发送失败', details: err.message }),
    };
  }
};