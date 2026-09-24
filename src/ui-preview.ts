import type { DeepPartial, Field, Type } from '@directus/types';
import type { Component } from 'vue';

export type OptionField = DeepPartial<Field> & { field: string };

export interface ResolvedOptions {
	/** Fields to render in a v-form, when the extension declares its options as a field list. */
	fields: OptionField[];
	/** A custom options component, when the extension ships its own options UI. */
	component: Component | null;
}

/**
 * Mirrors how Directus itself treats an interface/display's `options`: a function is called with
 * the extension context, an array is a list of fields, and any other object is a Vue component
 * that renders its own options UI.
 */
export function resolveOptions(options: unknown, ctx: unknown): ResolvedOptions {
	const resolved = typeof options === 'function' ? (options as (ctx: unknown) => unknown)(ctx) : options;

	if (Array.isArray(resolved)) return { fields: resolved as OptionField[], component: null };
	if (resolved && typeof resolved === 'object') return { fields: [], component: resolved as Component };
	return { fields: [], component: null };
}

export function getOptionDefaults(fields: OptionField[]): Record<string, unknown> {
	const defaults: Record<string, unknown> = {};

	for (const field of fields) {
		const defaultValue = field.schema?.default_value;
		if (defaultValue !== undefined && defaultValue !== null) {
			defaults[field.field] = defaultValue;
		}
	}

	return defaults;
}

const TEST_VALUE_INTERFACES: Partial<Record<Type, { interface: string; options?: Record<string, unknown> }>> = {
	boolean: { interface: 'boolean' },
	integer: { interface: 'input' },
	bigInteger: { interface: 'input' },
	float: { interface: 'input' },
	decimal: { interface: 'input' },
	text: { interface: 'input-multiline' },
	json: { interface: 'input-code', options: { language: 'JSON', lineNumber: false } },
	csv: { interface: 'tags' },
	date: { interface: 'datetime' },
	time: { interface: 'datetime' },
	dateTime: { interface: 'datetime' },
	timestamp: { interface: 'datetime' },
};

/** The v-form field used to edit the value handed to the interface/display being previewed. */
export function buildTestValueField(type: Type): OptionField {
	const config = TEST_VALUE_INTERFACES[type] ?? { interface: 'input' };

	return {
		name: 'Test Value',
		field: 'value',
		type,
		meta: {
			field: 'value',
			interface: config.interface,
			options: { placeholder: 'Test Value', ...config.options },
			width: 'full',
		},
	} as OptionField;
}

/** Picks the field type to preview with: the requested one if supported, else the extension's first. */
export function pickFieldType(types: readonly string[] | undefined, preferred?: string | null): Type {
	if (preferred && (!types?.length || types.includes(preferred))) return preferred as Type;
	return (types?.[0] ?? 'string') as Type;
}
