# Test script (run identically on both apps, in one session, in order)

1. No tool: `Explique em uma frase o que é streaming de tokens.`
2. One tool: `Qual o clima em São Paulo agora?`
3. Both tools: `Qual o clima e que horas são em Tokyo (Asia/Tokyo)?`
4. History: `E em Lisboa, o clima? Compare com a cidade que perguntei antes.`

Failure cases: `Clima em Xyzzyville`, then a run with an invalid FAL_KEY.
