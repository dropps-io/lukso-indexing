import { seedLuksoStructure } from './seed';
import { populateLuksoStructure } from './populate';

seedLuksoStructure(true).then(() => {
  populateLuksoStructure().then();
});
