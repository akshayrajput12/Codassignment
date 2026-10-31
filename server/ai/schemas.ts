import { z } from 'zod';

export const AddressAssessmentSchema = z.object({
  completeness: z.enum(['complete', 'partial', 'insufficient', 'unknown']),
  missingComponents: z.array(
    z.enum(['house_building', 'locality_landmark', 'city', 'state', 'pincode'])
  ),
  placeholderName: z.enum(['likely', 'unlikely', 'unknown']),
  interpretedAddress: z.string().nullable(),
  language: z.enum(['en', 'hi', 'hinglish', 'other', 'unknown']),
  evidence: z.array(z.string()),
  uncertainty: z.enum(['low', 'medium', 'high']),
});

export type AddressAssessment = z.infer<typeof AddressAssessmentSchema>;

export const ReplyAssessmentSchema = z.object({
  intent: z.enum([
    'confirm',
    'reject',
    'prefer_cod',
    'prepaid_interest',
    'address_correction',
    'opt_out',
    'unknown',
  ]),
  correctionText: z.string().nullable(),
  evidence: z.string(),
  uncertainty: z.enum(['low', 'medium', 'high']),
});

export type ReplyAssessment = z.infer<typeof ReplyAssessmentSchema>;
