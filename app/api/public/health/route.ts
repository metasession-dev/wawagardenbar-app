import { NextResponse } from 'next/server';

/**
 * GET /api/public/health
 *
 * Health check endpoint. **No authentication required.**
 * Returns the service status, name, version, uptime, and current timestamp.
 * Useful for monitoring, load balancers, and availability probes.
 *
 * @authentication None — this endpoint is public
 * @ratelimit      30 requests / minute (moderate)
 *
 * @returns {Object}  response
 * @returns {boolean} response.success             - `true`
 * @returns {Object}  response.data                - Health information
 * @returns {string}  response.data.status         - `"healthy"`
 * @returns {string}  response.data.service        - Service identifier (`"wawa-garden-bar-api"`)
 * @returns {string}  response.data.version        - API version (`"1.0.0"`)
 * @returns {number}  response.data.uptime         - Process uptime in seconds
 * @returns {string}  response.data.timestamp      - ISO 8601 current timestamp
 *
 * @status 200 - Service is healthy
 *
 * @example
 * // Request
 * GET /api/public/health
 *
 * // Response 200
 * {
 *   "success": true,
 *   "data": {
 *     "status": "healthy",
 *     "service": "wawa-garden-bar-api",
 *     "version": "1.0.0",
 *     "uptime": 84523.45,
 *     "timestamp": "2025-06-01T12:00:00.000Z"
 *   }
 * }
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json(
    {
      success: true,
      data: {
        status: 'healthy',
        service: 'wawa-garden-bar-api',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      },
    },
    { status: 200 }
  );
}
