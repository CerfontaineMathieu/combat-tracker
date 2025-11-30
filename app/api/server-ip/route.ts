import { NextResponse } from "next/server"

export async function GET() {
  // Use LOCAL_IP environment variable (required for Docker)
  // Set this in docker-compose.yml or .env file
  const serverIp = process.env.LOCAL_IP || "192.168.1.2"

  return NextResponse.json({ ip: serverIp })
}
