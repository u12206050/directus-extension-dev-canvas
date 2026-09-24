import { describe, expect, it } from 'vitest';
import { defineComponent } from 'vue';
import { buildTestValueField, getOptionDefaults, pickFieldType, resolveOptions, type OptionField } from './ui-preview';

const fields: OptionField[] = [
	{ field: 'kind', schema: { default_value: 'url' } },
	{ field: 'showUrl', type: 'boolean', schema: { default_value: false } },
	{ field: 'icon' },
	{ field: 'prefix', schema: { default_value: null } },
];

describe('resolveOptions', () => {
	it('returns field lists as-is', () => {
		expect(resolveOptions(fields, {})).toEqual({ fields, component: null });
	});

	it('calls option functions with the extension context', () => {
		const ctx = { field: { type: 'json' } };
		const result = resolveOptions((c: typeof ctx) => [{ field: c.field.type }], ctx);
		expect(result.fields).toEqual([{ field: 'json' }]);
	});

	it('treats any other object as a custom options component', () => {
		const component = defineComponent({ name: 'CustomOptions' });
		expect(resolveOptions(component, {})).toEqual({ fields: [], component });
	});

	it('handles extensions without options', () => {
		expect(resolveOptions(null, {})).toEqual({ fields: [], component: null });
		expect(resolveOptions(undefined, {})).toEqual({ fields: [], component: null });
		expect(resolveOptions(() => null, {})).toEqual({ fields: [], component: null });
	});
});

describe('getOptionDefaults', () => {
	it('collects non-null schema defaults, including falsy ones', () => {
		expect(getOptionDefaults(fields)).toEqual({ kind: 'url', showUrl: false });
	});
});

describe('pickFieldType', () => {
	it('uses the preferred type when the extension supports it', () => {
		expect(pickFieldType(['string', 'json'], 'json')).toBe('json');
	});

	it('falls back to the first supported type', () => {
		expect(pickFieldType(['uuid', 'integer'], 'json')).toBe('uuid');
		expect(pickFieldType(['uuid', 'integer'])).toBe('uuid');
	});

	it('defaults to string when the extension declares no types', () => {
		expect(pickFieldType(undefined)).toBe('string');
		expect(pickFieldType([], 'json')).toBe('json');
	});
});

describe('buildTestValueField', () => {
	it('picks an interface that can edit the field type', () => {
		expect(buildTestValueField('json').meta?.interface).toBe('input-code');
		expect(buildTestValueField('boolean').meta?.interface).toBe('boolean');
		expect(buildTestValueField('string').meta?.interface).toBe('input');
		expect(buildTestValueField('json').type).toBe('json');
	});
});
