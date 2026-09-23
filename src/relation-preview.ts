import type { Field, FieldMeta, Relation, RelationMeta } from '@directus/types';

export const RELATION_PREVIEW_FIELD = '__dev_canvas_relation__';
const REVERSE_FIELD = '__dev_canvas_relation_reverse__';

export type RelationLocalType = 'm2o' | 'o2m';

export interface PreviewFieldsStore {
	getPrimaryKeyFieldForCollection(collection: string): Field | null;
}

export interface PreviewFieldsCollection {
	fields: Field[];
}

export interface PreviewRelationsCollection {
	relations: Relation[];
}

function fakeFieldMeta(collection: string, field: string, special: string[], interfaceId: string): FieldMeta {
	return {
		id: -1,
		collection,
		field,
		group: null,
		hidden: false,
		interface: interfaceId,
		display: null,
		options: null,
		display_options: null,
		readonly: false,
		required: false,
		sort: null,
		special,
		translations: null,
		width: null,
		note: 'Injected by Developer Canvas to preview this relation. Never sent to the API.',
		conditions: null,
		validation: null,
		validation_message: null,
		searchable: false,
	};
}

function fakeField(collection: string, field: string, type: Field['type'], special: string[], interfaceId: string): Field {
	return {
		collection,
		field,
		type,
		schema: null,
		meta: fakeFieldMeta(collection, field, special, interfaceId),
		name: field,
	};
}

function fakeRelationMeta(overrides: Partial<RelationMeta>): RelationMeta {
	return {
		id: -1,
		many_collection: '',
		many_field: '',
		one_collection: null,
		one_field: null,
		one_collection_field: null,
		one_allowed_collections: null,
		one_deselect_action: 'nullify',
		junction_field: null,
		sort_field: null,
		...overrides,
	};
}

export interface RelationPreview {
	type: RelationLocalType;
	/** The field key to render the interface/display against, on the Test Collection. */
	field: string;
	relation: Relation;
	fields: Field[];
}

/**
 * Builds the synthetic Field(s) + Relation needed for Directus's own relation composables
 * (useRelationM2O / useRelationO2M) to resolve a real relation for a field that only exists
 * for the duration of a Developer Canvas preview. Both relation shapes reuse the same
 * `collection` + `field.type/related_collection` conventions real Directus relations use, per
 * `getRelations`/`getRelationType` in `@directus/utils`.
 */
export function buildRelationPreview(
	localType: RelationLocalType,
	collection: string,
	relatedCollection: string,
	fieldsStore: PreviewFieldsStore
): RelationPreview | null {
	if (!collection || !relatedCollection) return null;

	if (localType === 'm2o') {
		const relatedPk = fieldsStore.getPrimaryKeyFieldForCollection(relatedCollection);
		if (!relatedPk) return null;

		const field = fakeField(collection, RELATION_PREVIEW_FIELD, relatedPk.type, ['m2o'], 'select-dropdown-m2o');
		const relation: Relation = {
			collection,
			field: RELATION_PREVIEW_FIELD,
			related_collection: relatedCollection,
			schema: null,
			meta: fakeRelationMeta({
				many_collection: collection,
				many_field: RELATION_PREVIEW_FIELD,
				one_collection: relatedCollection,
			}),
		};

		return { type: 'm2o', field: RELATION_PREVIEW_FIELD, relation, fields: [field] };
	}

	const collectionPk = fieldsStore.getPrimaryKeyFieldForCollection(collection);
	if (!collectionPk) return null;

	const o2mField = fakeField(collection, RELATION_PREVIEW_FIELD, 'alias', ['o2m'], 'list-o2m');
	const reverseField = fakeField(relatedCollection, REVERSE_FIELD, collectionPk.type, ['m2o'], 'select-dropdown-m2o');
	const relation: Relation = {
		collection: relatedCollection,
		field: REVERSE_FIELD,
		related_collection: collection,
		schema: null,
		meta: fakeRelationMeta({
			many_collection: relatedCollection,
			many_field: REVERSE_FIELD,
			one_collection: collection,
			one_field: RELATION_PREVIEW_FIELD,
		}),
	};

	return { type: 'o2m', field: RELATION_PREVIEW_FIELD, relation, fields: [o2mField, reverseField] };
}

/**
 * Keeps at most one relation preview injected into the live fields/relations stores at a time,
 * so switching extension/collection never leaves a stale synthetic field behind.
 */
export function createRelationPreviewController(fieldsStore: PreviewFieldsCollection, relationsStore: PreviewRelationsCollection) {
	let active: RelationPreview | null = null;

	function clear() {
		if (!active) return;
		const injectedFields = active.fields;
		const injectedRelation = active.relation;
		fieldsStore.fields = fieldsStore.fields.filter((field) => !injectedFields.includes(field));
		relationsStore.relations = relationsStore.relations.filter((relation) => relation !== injectedRelation);
		active = null;
	}

	function apply(
		localType: RelationLocalType | null,
		collection: string,
		relatedCollection: string,
		fieldsLookup: PreviewFieldsStore
	): RelationPreview | null {
		clear();
		if (!localType) return null;

		const preview = buildRelationPreview(localType, collection, relatedCollection, fieldsLookup);
		if (!preview) return null;

		fieldsStore.fields = [...fieldsStore.fields, ...preview.fields];
		relationsStore.relations = [...relationsStore.relations, preview.relation];
		active = preview;
		return preview;
	}

	return { apply, clear };
}
