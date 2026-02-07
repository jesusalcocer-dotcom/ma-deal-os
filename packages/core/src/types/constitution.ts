/**
 * Partner Constitution & Governance Types
 * Defines the structure for deal-specific governance rules.
 */

export interface HardConstraint {
  id: string;
  category: string; // 'negotiation', 'communication', 'financial', 'drafting', 'process'
  description: string;
  rule: string; // Machine-readable rule
  consequence: 'block_and_escalate' | 'escalate' | 'flag';
}

export interface Preference {
  id: string;
  category: string;
  description: string;
  default_behavior: string;
  override_condition: string;
}

export interface StrategicDirective {
  id: string;
  description: string;
  applies_to: string[]; // e.g., ['document_pipeline', 'email_communication']
  priority: 'primary' | 'secondary' | 'background';
}

export interface PartnerConstitution {
  hard_constraints: HardConstraint[];
  preferences: Preference[];
  strategic_directives: StrategicDirective[];
}

export interface ConstitutionDelta {
  add_constraints: HardConstraint[];
  add_preferences: Preference[];
  add_directives: StrategicDirective[];
  modify: Array<{
    id: string;
    changes: Partial<HardConstraint | Preference | StrategicDirective>;
  }>;
  reasoning: string;
}
