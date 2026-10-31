import fs from 'fs';
import path from 'path';
import { EvidenceClient } from '@/components/evidence/EvidenceClient';

export const dynamic = 'force-dynamic';

export default function EvidencePage() {
  const artifactsDir = path.resolve(process.cwd(), 'artifacts');

  let dataQuality = {};
  let findings = [];
  let replaySummary = {};

  try {
    const dqPath = path.join(artifactsDir, 'data-quality.json');
    if (fs.existsSync(dqPath)) {
      dataQuality = JSON.parse(fs.readFileSync(dqPath, 'utf-8'));
    }

    const fPath = path.join(artifactsDir, 'findings.json');
    if (fs.existsSync(fPath)) {
      findings = JSON.parse(fs.readFileSync(fPath, 'utf-8'));
    }

    const rPath = path.join(artifactsDir, 'september-replay.json');
    if (fs.existsSync(rPath)) {
      replaySummary = JSON.parse(fs.readFileSync(rPath, 'utf-8'));
    }
  } catch (err) {
    console.error('Error reading artifacts for evidence page:', err);
  }

  return (
    <EvidenceClient
      dataQuality={dataQuality}
      findings={findings}
      replaySummary={replaySummary}
    />
  );
}
