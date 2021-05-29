import * as Comlink from 'comlink';
import { setupManager } from './setup-manager';

const manager = setupManager();

Comlink.expose(manager);
