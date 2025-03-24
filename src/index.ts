export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    // Extract the API key from the request headers
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized: Missing or invalid Authorization header', { status: 401 });
    }

    const requestApiKey = authHeader.split(' ')[1]; // Extract the key after "Bearer "
    const validApiKey = env.CLOUDFLARE_API_KEY; // Get the valid API key from environment variables

    // Validate the API key
    if (requestApiKey !== validApiKey) {
      return new Response('Unauthorized: Invalid API key', { status: 401 });
    }

    // Parse the prompt from the request
    let prompt = 'cyberpunk cat'; // Default prompt
    const url = new URL(request.url);

    // Get the prompt from query parameters (e.g., ?prompt=cyberpunk+cat)
    if (url.searchParams.has('prompt')) {
      prompt = url.searchParams.get('prompt')!;
    }

    // Alternatively, get the prompt from the request body (for POST requests)
    if (request.method === 'POST') {
      try {
        const body = await request.json();
        if (body.prompt) {
          prompt = body.prompt;
        }
      } catch (error) {
        console.error('Error parsing request body:', error);
      }
    }

    // Call the AI model
    const response = await env.AI.run(
      '@cf/stabilityai/stable-diffusion-xl-base-1.0',
      { prompt }
    );

    // Return the image with CORS headers
    return new Response(response, {
      headers: {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': '*', // Allow requests from any origin
      },
    });
  },
} satisfies ExportedHandler<Env>;
