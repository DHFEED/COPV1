# COP Netlify Gemini 챗봇

## 배포

1. 이 폴더를 GitHub 저장소에 올립니다.
2. Netlify에서 저장소를 연결합니다.
3. Build command는 비워 두고 Publish directory는 `.`로 설정합니다.
4. Netlify의 **Site configuration > Environment variables**에서 다음 값을 추가합니다.

```text
GEMINI_API_KEY=Google AI Studio에서 발급한 키
GEMINI_MODEL=gemini-2.5-flash-lite
```

5. 새로 배포한 뒤 `/api/chat` 함수가 동작하는지 확인합니다.

`GEMINI_MODEL`은 선택 사항입니다. 생략하면 `gemini-2.5-flash-lite`를 사용합니다.

## 보안

- API 키를 `index.html`이나 GitHub 저장소에 넣지 마세요.
- 키는 Netlify 환경변수에만 저장하세요.
- 게시글 필터는 기존처럼 브라우저의 무료 규칙 기반 필터를 사용하므로 Gemini 호출 비용이 발생하지 않습니다.
