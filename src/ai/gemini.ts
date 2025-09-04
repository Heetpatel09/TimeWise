// app/api/gemini/route.ts (Next.js App Router)

export async function POST(req: Request) {
    const body = await req.json();
  
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
        },
        body: JSON.stringify({
          contents: [
            { role: "user", parts: [{ text: body.prompt }] }
          ],
        }),
      }
    );
  
    const data = await response.json();
    return Response.json(data);
  }
  