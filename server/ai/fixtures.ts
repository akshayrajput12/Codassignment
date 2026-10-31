import { AddressAssessment, ReplyAssessment } from './schemas';

export function getOfflineAddressAssessment(params: {
  customerName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}): AddressAssessment {
  const missing: Array<'house_building' | 'locality_landmark' | 'city' | 'state' | 'pincode'> = [];

  const addr = (params.address || '').toLowerCase();
  const name = (params.customerName || '').toLowerCase();

  if (!params.city) missing.push('city');
  if (!params.state) missing.push('state');
  if (!params.pincode || !/^\d{6}$/.test(params.pincode)) missing.push('pincode');

  // Check for house/building indicator
  const hasBuilding =
    /\b(flat|house|plot|shop|room|no|sector|block|floor|gali|road|street|building|society|apt|apartment)\b/i.test(
      addr
    ) || /\d+[\/\-]?\d*/.test(addr);

  if (!hasBuilding) {
    missing.push('house_building');
  }

  // Check landmark
  const hasLandmark = /\b(near|opp|opposite|ke saamne|chowk|mandir|masjid|school|hospital|station|bazar|market)\b/i.test(
    addr
  );
  if (!hasLandmark && !addr.includes(',')) {
    missing.push('locality_landmark');
  }

  // Placeholder name detection
  const isPlaceholder =
    name === 'test' ||
    name === 'asdf' ||
    name === 'abc' ||
    name === 'xyz' ||
    name === 'user' ||
    name.length < 3;

  // Language detection
  const isHinglish = /\b(ke saamne|se left|se right|gali|nagar|chowk|mandir)\b/i.test(addr);

  let completeness: 'complete' | 'partial' | 'insufficient' = 'complete';
  if (missing.length >= 2 || !params.pincode) {
    completeness = 'insufficient';
  } else if (missing.length === 1) {
    completeness = 'partial';
  }

  return {
    completeness,
    missingComponents: missing,
    placeholderName: isPlaceholder ? 'likely' : 'unlikely',
    interpretedAddress: params.address,
    language: isHinglish ? 'hinglish' : 'en',
    evidence: [
      hasBuilding ? 'Building/house indicator found' : 'Missing building or street number',
      hasLandmark ? 'Local landmark identified' : 'No explicit landmark',
      isPlaceholder ? 'Name appears to be placeholder test text' : 'Valid customer name structure',
    ],
    uncertainty: missing.length > 0 ? 'medium' : 'low',
  };
}

export function getOfflineReplyAssessment(replyText: string): ReplyAssessment {
  const t = replyText.toLowerCase().trim();

  if (t === 'stop' || t === 'unsubscribe') {
    return {
      intent: 'opt_out',
      correctionText: null,
      evidence: 'Explicit stop command received',
      uncertainty: 'low',
    };
  }

  if (t.includes('cancel') || t === 'no' || t.includes('nahi') || t === 'mat bhejo') {
    return {
      intent: 'reject',
      correctionText: null,
      evidence: 'Cancellation phrase matched',
      uncertainty: 'low',
    };
  }

  if (t.includes('cod') || t.includes('cash on delivery') || t.includes('keep cod')) {
    return {
      intent: 'prefer_cod',
      correctionText: null,
      evidence: 'Customer requested COD fulfillment',
      uncertainty: 'low',
    };
  }

  if (t.includes('pay online') || t.includes('prepaid') || t.includes('link bhejo') || t.includes('discount')) {
    return {
      intent: 'prepaid_interest',
      correctionText: null,
      evidence: 'Customer showed interest in prepaid discount',
      uncertainty: 'low',
    };
  }

  if (t.includes('address') || t.includes('flat') || t.includes('house') || t.includes('gali')) {
    return {
      intent: 'address_correction',
      correctionText: replyText,
      evidence: 'Address modification phrase detected',
      uncertainty: 'medium',
    };
  }

  if (
    t === 'yes' ||
    t === 'confirm' ||
    t === 'haan' ||
    t === 'ha' ||
    t.includes('confirm') ||
    t.includes('haan') ||
    t.includes('yes') ||
    t.includes('sahi hai') ||
    t.includes('पुष्टि')
  ) {
    return {
      intent: 'confirm',
      correctionText: null,
      evidence: 'Affirmative confirmation received',
      uncertainty: 'low',
    };
  }

  return {
    intent: 'unknown',
    correctionText: null,
    evidence: 'Ambiguous reply text requiring clarification',
    uncertainty: 'high',
  };
}
