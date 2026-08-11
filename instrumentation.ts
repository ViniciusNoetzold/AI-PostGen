export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    console.info(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      message: "application_started",
      service: "ai-post-gen",
    }));
  }
}
