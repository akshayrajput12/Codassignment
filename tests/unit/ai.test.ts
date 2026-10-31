import { describe, it, expect } from 'vitest';
import { assessAddressWithGemini, assessReplyWithGemini } from '@/server/ai/gemini';
import { getOfflineAddressAssessment, getOfflineReplyAssessment } from '@/server/ai/fixtures';

describe('Phase 5: Gemini LLM Integration & Offline Fallback', () => {
  it('falls back gracefully to offline fixture when GEMINI_API_KEY is not set', async () => {
    const result = await assessAddressWithGemini({
      customerName: 'Aarav Sharma',
      address: 'Shop No 4, Link Chowk ke saamne, Near Metro Pillar 12',
      city: 'Delhi',
      state: 'Delhi',
      pincode: '110001',
    });

    expect(result.source).toBe('fixture');
    expect(result.assessment.completeness).toBe('complete');
    expect(result.assessment.language).toBe('hinglish');
  });

  it('detects missing house number in vague address', () => {
    const fixture = getOfflineAddressAssessment({
      customerName: 'Sunil Kumar',
      address: 'Near Gandhi Chowk',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411001',
    });

    expect(fixture.missingComponents).toContain('house_building');
    expect(fixture.completeness).toBe('partial');
  });

  it('detects placeholder test names', () => {
    const fixture = getOfflineAddressAssessment({
      customerName: 'asdf',
      address: 'Flat 101, Main Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    });

    expect(fixture.placeholderName).toBe('likely');
  });

  it('classifies ambiguous and explicit replies accurately via offline fixtures', () => {
    expect(getOfflineReplyAssessment('STOP').intent).toBe('opt_out');
    expect(getOfflineReplyAssessment('cancel order please').intent).toBe('reject');
    expect(getOfflineReplyAssessment('Keep COD').intent).toBe('prefer_cod');
    expect(getOfflineReplyAssessment('haan confirm kar do').intent).toBe('confirm');
    expect(getOfflineReplyAssessment('random gibberish hello').intent).toBe('unknown');
  });
});
