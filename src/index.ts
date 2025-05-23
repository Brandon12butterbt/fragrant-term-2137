export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'http://localhost:3000, http://localhost:4200, https://afluxgen.com',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization', // Allow Authorization header
        },
      });
    }

    // Enforce Referer/Origin restriction
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:4200', 'https://afluxgen.com'];
    const origin = request.headers.get('Origin') || '';
    const referer = request.headers.get('Referer') || '';
    
    // If the origin is not allowed, log and respond with the invalid origin
    if (!allowedOrigins.some((allowedOrigin) => origin.startsWith(allowedOrigin))) {
      return new Response(`Forbidden: Invalid origin (${origin} | Referer: ${referer})`, { status: 403 });
    }

    // Extract the API key from the request headers
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response('Unauthorized: Missing or invalid Authorization header', { status: 401 });
    }

    const requestApiKey = authHeader.split(' ')[1];
    const validApiKey = env.CLOUDFLARE_API_KEY;

    // Validate the API key
    if (requestApiKey !== validApiKey) {
      return new Response('Unauthorized: Invalid API key', { status: 401 });
    }

    let prompt = 'cyberpunk cat'; // Default prompt
    const url = new URL(request.url);

    // Get the prompt from query parameters
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
    const corsOrigin = allowedOrigins.includes(origin) ? origin : '';
    
    return new Response(response, {
      headers: {
        'Content-Type': 'image/png',
        'Access-Control-Allow-Origin': corsOrigin,
        'Vary': 'Origin',
      },
    });
  },
} satisfies ExportedHandler<Env>;
