const HF_TOKEN = process.env.NEXT_PUBLIC_HF_TOKEN;

async function testHFRouter(model) {
  const url = `https://router.huggingface.co/v1/chat/completions`;
  try {
    console.log("Testing:", model);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${HF_TOKEN}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: "user", content: "Hello, what is your name?" }],
        max_tokens: 15
      })
    });
    
    console.log("Status:", response.status);
    const data = await response.json();
    console.log("Response:", JSON.stringify(data));
  } catch(e) {
    console.error("Fetch error:", e.message);
  }
}

async function run() {
  await testHFRouter('meta-llama/Llama-3.2-3B-Instruct');
  await testHFRouter('Qwen/Qwen2.5-7B-Instruct');
}

run();
