import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import { getRedis } from '@/lib/redis';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'healthy' | 'unhealthy' | 'unknown';
    redis: 'healthy' | 'unhealthy' | 'unknown';
  };
}

export async function GET() {
  const checks: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      redis: 'unknown',
    }
  };

  // Check database
  try {
    await pool.query('SELECT 1');
    checks.services.database = 'healthy';
  } catch {
    checks.services.database = 'unhealthy';
    checks.status = 'degraded';
  }

  // Check Redis
  try {
    const redis = await getRedis();
    await redis.ping();
    checks.services.redis = 'healthy';
  } catch {
    checks.services.redis = 'unhealthy';
    checks.status = 'degraded';
  }

  // If both are unhealthy, mark as completely unhealthy
  if (checks.services.database === 'unhealthy' && checks.services.redis === 'unhealthy') {
    checks.status = 'unhealthy';
  }

  const httpStatus = checks.status === 'healthy' ? 200 : checks.status === 'degraded' ? 503 : 500;
  return NextResponse.json(checks, { status: httpStatus });
}
