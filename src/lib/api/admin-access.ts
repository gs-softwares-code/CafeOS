import { getRuntimeEnvironment } from '../db';

export function isDevelopmentAdminApiEnabled(): boolean {
  const environment = getRuntimeEnvironment();
  return environment.ENVIRONMENT === 'development';
}
