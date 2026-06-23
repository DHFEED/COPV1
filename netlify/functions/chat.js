const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify(body)
  };
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .slice(-20)
    .map(message => ({
      role: message?.role === 'assistant' ? 'model' : 'user',
      text: String(message?.content || '').trim().slice(0, 4000)
    }))
    .filter(message => message.text);
}

exports.handler = async function handler(event) {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'POST 요청만 지원합니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  if (!apiKey) {
    return json(500, { error: 'Netlify 환경변수 GEMINI_API_KEY가 설정되지 않았습니다.' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: '요청 형식이 올바르지 않습니다.' });
  }

  const messages = normalizeMessages(payload.messages);
  if (!messages.length) {
    return json(400, { error: '질문 내용을 입력해 주세요.' });
  }

  const totalChars = messages.reduce((sum, message) => sum + message.text.length, 0);
  if (totalChars > 24000) {
    return json(413, { error: '대화가 너무 깁니다. 대화를 초기화한 뒤 다시 질문해 주세요.' });
  }

  const system = String(payload.system || '').trim().slice(0, 4000);
  const requestBody = {
    contents: messages.map(message => ({
      role: message.role,
      parts: [{ text: message.text }]
    })),
    generationConfig: {
      maxOutputTokens: 600,
      temperature: 0.7
    }
  };
  if (system) requestBody.systemInstruction = { parts: [{ text: system }] };

  try {
    const response = await fetch(`${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(25000)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = data?.error?.message || `Gemini API 오류 (${response.status})`;
      console.error('Gemini API error:', detail);
      return json(response.status === 429 ? 429 : 502, {
        error: response.status === 429 ? '무료 사용 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.' : detail
      });
    }

    const reply = (data.candidates?.[0]?.content?.parts || [])
      .map(part => part.text || '')
      .join('')
      .trim();
    if (!reply) {
      return json(502, { error: 'Gemini에서 답변을 생성하지 못했습니다.' });
    }

    return json(200, { reply });
  } catch (error) {
    console.error('Chat function error:', error);
    const timedOut = error?.name === 'TimeoutError';
    return json(504, { error: timedOut ? '응답 시간이 초과됐습니다. 다시 시도해 주세요.' : '챗봇 서버 연결에 실패했습니다.' });
  }
};
