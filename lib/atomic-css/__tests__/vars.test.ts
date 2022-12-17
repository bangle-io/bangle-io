import { vars } from '../';
import { cssCustomProperties } from '../vars';

test('vars snapshot', () => {
  expect(vars).toMatchSnapshot();
});
test('cssCustomProperties snapshot', () => {
  expect(cssCustomProperties).toMatchSnapshot();
});
