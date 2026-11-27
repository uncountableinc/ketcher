import 'src/i18n/i18n';
import {
  getAttachSchema,
  getTemplateNameValidationMessage,
} from './struct-schema';

const templateLib = [
  { struct: { name: 'Benzene ring' }, props: { group: 'User Templates' } },
  { struct: { name: 'Cyclohexane' }, props: { group: 'Rings' } },
];

describe('template name validation', () => {
  it.each([
    ['', 'Template name cannot be empty'],
    ['   ', 'Template name cannot be empty'],
    ['a'.repeat(129), 'Template name cannot exceed 128 characters'],
    ['Benzene ring', 'A template named "Benzene ring" already exists'],
  ])('explains why %j is invalid', (name, message) => {
    expect(getTemplateNameValidationMessage(name, templateLib)).toBe(message);
    const nameSchema = getAttachSchema(templateLib).properties.name;
    expect(
      typeof nameSchema.invalidMessage === 'function' &&
        nameSchema.invalidMessage(name),
    ).toBe(message);
  });

  it.each(['Cyclohexane', 'a'.repeat(128), 'New template'])(
    'accepts %j',
    (name) => {
      expect(getTemplateNameValidationMessage(name, templateLib)).toBe('');
    },
  );

  it('treats a missing name as empty', () => {
    const nameSchema = getAttachSchema(templateLib).properties.name;
    expect(
      typeof nameSchema.invalidMessage === 'function' &&
        nameSchema.invalidMessage({}),
    ).toBe('Template name cannot be empty');
  });
});
