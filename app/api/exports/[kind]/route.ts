import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(
  _req: NextRequest,
  { params }: { params: { kind: string } }
) {
  try {
    const kind = params.kind;
    const artifactsDir = path.resolve(process.cwd(), 'artifacts');

    if (kind === 'replay-csv') {
      const filePath = path.join(artifactsDir, 'september-replay.csv');
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ success: false, error: 'Replay CSV not generated yet' }, { status: 404 });
      }
      const fileData = fs.readFileSync(filePath);
      return new NextResponse(fileData, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="september-replay-orders.csv"',
        },
      });
    }

    if (kind === 'data-quality-json') {
      const filePath = path.join(artifactsDir, 'data-quality.json');
      if (!fs.existsSync(filePath)) {
        return NextResponse.json({ success: false, error: 'Data quality report not found' }, { status: 404 });
      }
      const fileData = fs.readFileSync(filePath);
      return new NextResponse(fileData, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="data-quality.json"',
        },
      });
    }

    return NextResponse.json({ success: false, error: 'Unknown export kind' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Export error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
