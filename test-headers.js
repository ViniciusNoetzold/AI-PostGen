const HF_TOKEN = process.env.NEXT_PUBLIC_HF_TOKEN;

async function testHeaders() {
  const url = `https://router.huggingface.co/v1/chat/completions`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_TOKEN}`
      },
      body: JSON.stringify({
        model: 'Qwen/Qwen2.5-7B-Instruct',
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5
      })
    });
    
    console.log("Status:", response.status);
    console.log("Headers:");
    for (let [key, value] of response.headers.entries()) {
      console.log(`${key}: ${value}`);
    }
  } catch(e) {
    console.error(e.message);
  }
}

testHeaders();
