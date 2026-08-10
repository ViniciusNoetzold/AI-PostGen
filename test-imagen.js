import dotenv from 'dotenv';
dotenv.config({ path: 'e:/App Automação Meta/webapp/.env.local' });

async function testImagen() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No GEMINI_API_KEY in .env.local');
    return;
  }
  
  const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${apiKey}`;
  
  const reqBody = {
    instances: [
      { prompt: "A highly detailed cute cat drinking coffee, modern flat vector art" }
    ],
    parameters: {
      sampleCount: 1,
      aspectRatio: "1:1",
      outputOptions: { mimeType: "image/jpeg" }
    }
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody)
    });
    
    const data = await res.json();
    if (res.ok) {
      console.log('SUCCESS! Got image data.');
      // console.log(data);
    } else {
      console.log('API Error:', data);
    }
  } catch(e) {
    console.error('Fetch error:', e);
  }
}

testImagen();
