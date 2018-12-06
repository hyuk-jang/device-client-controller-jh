import AbstCommander from './src/device-commander/AbstCommander'
import Manager from './src/device-manager/Manager';

declare global {
  const AbstCommander: AbstCommander;
  const Manager: Manager;
}
