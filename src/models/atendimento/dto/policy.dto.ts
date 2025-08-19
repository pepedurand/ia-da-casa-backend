// src/modules/atendimento/dtos/policy.dto.ts
import { ITenantBase, PolicyTopic } from './common.types';

export interface IGetPolicyParams extends ITenantBase {
  topic: PolicyTopic;
}
export interface IGetPolicyResult {
  text: string;
  meta?: Record<string, any>;
}
