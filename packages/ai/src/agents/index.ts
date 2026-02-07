export * from './types';
export { loadManagerContext } from './manager/context-loader';
export { buildManagerPrompt } from './manager/system-prompt';
export { activateManager } from './manager/manager-agent';
export type { ManagerActivationResult } from './manager/manager-agent';
export {
  createSpecialist,
  specialistRegistry,
  getSpecialistConfig,
} from './specialists';
