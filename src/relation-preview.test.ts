import { getRelationType, getRelations } from '@directus/utils';
import type { Field, Relation } from '@directus/types';
import { describe, expect, it } from 'vitest';
import { buildRelationPreview, createRelationPreviewController, RELATION_PREVIEW_FIELD } from './relation-preview';

function fakePkField(collection: string, type: Field['type'] = 'integer'): Field {
	return {
		collection,
		field: 'id',
		type,
		schema: null,
		meta: null,
		name: 'id',
	};
}

const fieldsLookup = {
	getPrimaryKeyFieldForCollection(collection: string): Field | null {
		if (collection === 'articles') return fakePkField('articles', 'integer');
		if (collection === 'authors') return fakePkField('authors', 'uuid');
		return null;
	},
};

describe('buildRelationPreview', () => {
	it('returns null when the related collection has no known primary key', () => {
		expect(buildRelationPreview('m2o', 'articles', 'missing', fieldsLookup)).toBeNull();
		expect(buildRelationPreview('o2m', 'missing', 'articles', fieldsLookup)).toBeNull();
	});

	it('builds an m2o relation that Directus\'s own getRelations/getRelationType recognize', () => {
		const preview = buildRelationPreview('m2o', 'articles', 'authors', fieldsLookup)!;

		expect(preview.field).toBe(RELATION_PREVIEW_FIELD);
		expect(preview.fields).toHaveLength(1);
		expect(preview.fields[0]?.type).toBe('uuid');

		const matches = getRelations([preview.relation], 'articles', RELATION_PREVIEW_FIELD);
		expect(matches).toEqual([preview.relation]);
		expect(getRelationType({ relation: preview.relation, collection: 'articles', field: RELATION_PREVIEW_FIELD })).toBe('m2o');
	});

	it('builds an o2m relation that Directus\'s own getRelations/getRelationType recognize', () => {
		const preview = buildRelationPreview('o2m', 'authors', 'articles', fieldsLookup)!;

		expect(preview.field).toBe(RELATION_PREVIEW_FIELD);
		expect(preview.fields).toHaveLength(2);
		expect(preview.fields.map((f) => f.collection).sort()).toEqual(['articles', 'authors']);

		const matches = getRelations([preview.relation], 'authors', RELATION_PREVIEW_FIELD);
		expect(matches).toEqual([preview.relation]);
		expect(getRelationType({ relation: preview.relation, collection: 'authors', field: RELATION_PREVIEW_FIELD })).toBe('o2m');

		// The same relation row also resolves from the many side, as m2o, matching how
		// Directus itself treats o2m as just the reverse view of one physical relation.
		expect(
			getRelationType({ relation: preview.relation, collection: preview.relation.collection, field: preview.relation.field })
		).toBe('m2o');
	});
});

describe('createRelationPreviewController', () => {
	function makeStores() {
		return {
			fieldsStore: { fields: [] as Field[] },
			relationsStore: { relations: [] as Relation[] },
		};
	}

	it('injects the preview fields and relation into the provided stores', () => {
		const { fieldsStore, relationsStore } = makeStores();
		const controller = createRelationPreviewController(fieldsStore, relationsStore);

		const preview = controller.apply('m2o', 'articles', 'authors', fieldsLookup);

		expect(preview).not.toBeNull();
		expect(fieldsStore.fields).toHaveLength(1);
		expect(relationsStore.relations).toHaveLength(1);
	});

	it('clears a previous injection before applying a new one, never leaving both behind', () => {
		const { fieldsStore, relationsStore } = makeStores();
		const controller = createRelationPreviewController(fieldsStore, relationsStore);

		controller.apply('o2m', 'authors', 'articles', fieldsLookup);
		expect(fieldsStore.fields).toHaveLength(2);

		controller.apply('m2o', 'articles', 'authors', fieldsLookup);
		expect(fieldsStore.fields).toHaveLength(1);
		expect(relationsStore.relations).toHaveLength(1);
	});

	it('never touches entries it did not inject itself', () => {
		const { fieldsStore, relationsStore } = makeStores();
		const realField: Field = { collection: 'articles', field: 'title', type: 'string', schema: null, meta: null, name: 'title' };
		const realRelation: Relation = { collection: 'articles', field: 'author', related_collection: 'authors', schema: null, meta: null };
		fieldsStore.fields.push(realField);
		relationsStore.relations.push(realRelation);

		const controller = createRelationPreviewController(fieldsStore, relationsStore);
		controller.apply('m2o', 'articles', 'authors', fieldsLookup);
		controller.clear();

		expect(fieldsStore.fields).toEqual([realField]);
		expect(relationsStore.relations).toEqual([realRelation]);
	});

	it('clears and returns null when applied with no local type', () => {
		const { fieldsStore, relationsStore } = makeStores();
		const controller = createRelationPreviewController(fieldsStore, relationsStore);

		controller.apply('m2o', 'articles', 'authors', fieldsLookup);
		const result = controller.apply(null, 'articles', 'authors', fieldsLookup);

		expect(result).toBeNull();
		expect(fieldsStore.fields).toHaveLength(0);
		expect(relationsStore.relations).toHaveLength(0);
	});
});
