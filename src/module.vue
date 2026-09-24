<template>
	<v-dialog v-model="showDialog">
		<v-card class="dev-canvas-dialog">
			<v-card-title>Load Extension</v-card-title>
			<br />
			<v-sheet>
				<v-form :fields="LoadExtForm" v-model="extConfig" />

				<v-error v-if="error" :error="error" />
			</v-sheet>
			<v-card-actions>
				<v-button @click="loadExtensions" secondary>Reload Extensions List</v-button>
				<v-button @click="loadRemoteComponent">Load It</v-button>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<v-button icon class="dev-canvas-toggle" @click="showDialog = true">
		<v-icon name="developer_board" />
	</v-button>

	<!-- LAYOUTS -->
	<LayoutCanvas v-if="extensionDef && extType === 'layout'" :collection="extConfig.collection" :config="extensionDef" />
	<!-- MODULES -->
	<template v-else-if="extensionDef && extType === 'module'">
		<router-view />
	</template>
	<!-- DISPLAYS & INTERFACES -->
	<private-view
		v-else
		class="dev-canvas no-sidebar"
		title="Development Canvas">

		<v-sheet v-if="!extensionDef">
			<v-notice>No extension loaded</v-notice>
		</v-sheet>

		<div v-else class="dev-canvas-columns">
			<div class="dev-canvas-column">
				<v-sheet>
					<v-form v-model="previewSettings" :fields="previewSettingsFields" />
				</v-sheet>

				<v-sheet class="dev-canvas-options">
					<div class="dev-canvas-section-label type-label">Options</div>
					<component
						v-if="optionsComponent"
						:is="optionsComponent"
						:value="extOptions"
						:collection="extConfig.collection"
						:field="extField"
						@input="extOptions = $event ?? {}" />
					<v-form v-else-if="optionsFields.length" v-model="extOptions" :fields="optionsFields" primary-key="+" />
					<v-notice v-else>This {{ extType }} has no options.</v-notice>
				</v-sheet>
			</div>

			<v-sheet class="dev-canvas-column">
				<div class="dev-canvas-section-label type-label">Preview</div>
				<PreviewBoundary v-if="showExt" :reset-key="previewKey">
					<component
						v-if="extType === 'display'"
						:is="extensionDef"
						v-bind="extOptions"
						:value="previewSettings.value"
						:type="fieldType"
						:collection="extConfig.collection"
						:field="extField"
						:interface="null"
						:interface-options="{}" />
					<component
						v-else
						:is="extensionDef"
						v-bind="extOptions"
						:value="previewSettings.value"
						:type="fieldType"
						:collection="extConfig.collection"
						:field="extField"
						:field-data="fieldData"
						primary-key="+"
						width="full"
						:disabled="!!previewSettings.disabled"
						@input="updateExtValue"
						@set-field-value="onSetFieldValue" />
				</PreviewBoundary>
				<v-button class="dev-canvas-refresh" x-small secondary @click="refreshExt">Refresh</v-button>
			</v-sheet>
		</div>
	</private-view>

</template>

<script setup lang="ts">
import { useStores } from '@directus/composables';
import { computed, nextTick, onUnmounted, provide, ref, shallowRef, watch, type Component } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import LayoutCanvas from './LayoutCanvas.vue';
import PreviewBoundary from './PreviewBoundary';
import hmr from './hmr';
import { createRelationPreviewController, type RelationLocalType } from './relation-preview';
import {
	buildTestValueField,
	getOptionDefaults,
	pickFieldType,
	resolveOptions,
	type OptionField,
} from './ui-preview';

const router = useRouter();
let activeRoute: any;
const showDialog = ref(true);
const ctx = ref();

const stores = useStores();
const fieldsStore = stores.useFieldsStore();
const relationsStore = stores.useRelationsStore();
const relationPreview = createRelationPreviewController(fieldsStore, relationsStore);
onUnmounted(() => relationPreview.clear());

// This ref will hold the actual component definition
const extensionDef = ref();
const error = ref<any>(null);

const UI_EXTENSIONS = ['display', 'interface', 'layout', 'module', 'bundle'];
const DEFAULTS = {
	server: 'http://localhost:5173',
}
const extConfig = ref(DEFAULTS);
const extType = ref('');

// Toggle this between changes to refresh the component
const showExt = ref(true);
const previewKey = ref(0);

// For displays, interfaces
const extField = ref('value');
const extDefinition = shallowRef<any>(null);
const optionsFields = ref<OptionField[]>([]);
const optionsComponent = shallowRef<Component | null>(null);
const extOptions = ref<Record<string, any>>({});
const previewSettings = ref<{ type?: string; value?: unknown; disabled?: boolean }>({});
// Set when a relation preview is active: the fake field's type is fixed by the relation.
const relationFieldType = ref<string | null>(null);

const extensions = ref<Array<{
	type: string;
	name: string;
	source: string;
}>>([]);

const LoadExtForm = computed(() => {
	const opts = extensions.value.map((ext: any) => {
		return {
			text: `${ext.type.toUpperCase()} - ${ext.name}`,
			value: ext.name,
		}
	});
	opts.sort((a: any, b: any) => a.text.localeCompare(b.text));
	return [
		{
			name: 'Vite Server',
			field: 'server',
			type: 'string',
			meta: {
				interface: 'input',
				required: true,
				options: {
					placeholder: 'http://localhost:5173',
				},
				note: "The full url and port of your vite server",
			},
		},
		{
			name: 'Select Extension',
			field: 'extension',
			type: 'string',
			meta: {
				interface: 'select-dropdown',
				options: {
					items: opts,
				},
			},
		},
		{
			name: 'Test Collection',
			field: 'collection',
			type: 'string',
			meta: {
				interface: 'system-collection',
				options: {
					placeholder: 'Select collection',
				},
				conditions: [
					{
						name: "Extension selected",
						rule: {
							extension: {
								_nnull: true,
							},
						},
						hidden: false,
					},
				],
				hidden: true,
				note: "This is optional, your extension might not need it.",
			},
		},
		{
			name: 'Related Collection',
			field: 'related_collection',
			type: 'string',
			meta: {
				interface: 'system-collection',
				options: {
					placeholder: 'Select collection',
				},
				conditions: [
					{
						name: "Extension selected",
						rule: {
							extension: {
								_nnull: true,
							},
						},
						hidden: false,
					},
				],
				hidden: true,
				note: "Only needed to preview a many-to-one or one-to-many interface/display.",
			},
		},
	];
});

const supportedTypes = computed<string[]>(() => extDefinition.value?.types ?? []);

const fieldType = computed(() => relationFieldType.value ?? pickFieldType(supportedTypes.value, previewSettings.value.type));

const fieldData = computed(() => ({
	collection: extConfig.value.collection ?? null,
	field: extField.value,
	name: extField.value,
	type: fieldType.value,
	schema:
		fieldType.value === 'alias'
			? null
			: { default_value: null, is_nullable: true, is_primary_key: false, max_length: null, has_auto_increment: false },
	meta: {
		...ctx.value?.field?.meta,
		collection: extConfig.value.collection ?? null,
		field: extField.value,
		interface: extType.value === 'interface' ? extDefinition.value?.id : null,
		display: extType.value === 'display' ? extDefinition.value?.id : null,
		options: extType.value === 'interface' ? extOptions.value : null,
		display_options: extType.value === 'display' ? extOptions.value : null,
	},
}));

// Interfaces rendered by Directus live inside a v-form, which provides the item being edited.
provide(
	'values',
	computed(() => ({ [extField.value]: previewSettings.value.value })),
);

const previewSettingsFields = computed<OptionField[]>(() => {
	const fields: OptionField[] = [];

	if (!relationFieldType.value && supportedTypes.value.length > 1) {
		fields.push({
			name: 'Field Type',
			field: 'type',
			type: 'string',
			meta: {
				interface: 'select-dropdown',
				width: extType.value === 'interface' ? 'half' : 'full',
				options: { choices: supportedTypes.value.map((type) => ({ text: type, value: type })) },
				note: 'The type of the field this extension is previewed on.',
			},
			schema: { default_value: supportedTypes.value[0] },
		});
	}

	if (extType.value === 'interface') {
		fields.push({
			name: 'Disabled',
			field: 'disabled',
			type: 'boolean',
			meta: {
				interface: 'boolean',
				width: 'half',
				options: { label: 'Render the interface as disabled' },
			},
			schema: { default_value: false },
		});
	}

	// Relational displays receive the related item(s) as their value, not the stored key.
	const testValueType = extType.value === 'display' && relationFieldType.value ? 'json' : fieldType.value;
	fields.push(buildTestValueField(testValueType as typeof fieldType.value));
	return fields;
});

// Sync extPath with localStorage
try {
	const storedSettings = localStorage.getItem('dev-canvas-settings');
	if (storedSettings) {
		extConfig.value = JSON.parse(storedSettings);
		if (!extConfig.value.extension) {
			extConfig.value = DEFAULTS;
		}
	}
} catch (e) {
	extConfig.value = DEFAULTS;
}

// Watch for changes and update localStorage
watch(extConfig, (config) => {
	localStorage.setItem('dev-canvas-settings', JSON.stringify(config));
});

watch(() => extConfig.value.server, loadExtensions, { immediate: true });

// Remount when options or the field type change, since extensions commonly read those only on setup.
// Interfaces receive the test value as a reactive prop and must not remount on it (they'd lose focus),
// but Directus remounts displays per value (e.g. per table row), so displays commonly read it only on setup.
watch(extOptions, refreshExt);

watch(
	() => previewSettings.value.value,
	() => {
		if (extType.value === 'display') refreshExt();
	},
);

watch(fieldType, (type, oldType) => {
	if (type === oldType || !extDefinition.value) return;
	const { value: _discarded, ...settings } = previewSettings.value;
	previewSettings.value = settings;
	resolveExtensionOptions();
	refreshExt();
});

function refreshExt() {
	previewKey.value++;
	showExt.value = false;
	nextTick(() => {
		showExt.value = true;
	});
}

function updateExtValue(value: unknown) {
	previewSettings.value = { ...previewSettings.value, value };
}

function onSetFieldValue({ field, value }: { field: string; value: unknown }) {
	if (field === extField.value) updateExtValue(value);
	else console.info(`[Dev Canvas] ${extType.value} tried to set field "${field}" to`, value);
}

function resolveExtensionOptions() {
	// Preview as an existing field: options often hide settings while a field is still being created ('+').
	ctx.value.editing = extField.value;
	ctx.value.field.field = extField.value;
	ctx.value.field.collection = extConfig.value.collection ?? null;
	ctx.value.field.type = fieldType.value;
	const { fields, component } = resolveOptions(extDefinition.value?.options, ctx.value);
	optionsFields.value = fields;
	optionsComponent.value = component;
	extOptions.value = { ...getOptionDefaults(fields), ...extOptions.value };
}

async function loadExtensions() {
	// Check server is a url before loading using regex:
	if (!extConfig.value.server.match(/^https?:\/\/.*:\d{2,5}/)) return;

	try {
		const res = await fetch(`${extConfig.value.server}/package.json`);
		const pkg = await res.json();
		const extension = pkg["directus:extension"];

		if (!extension) {
			return error.value = 'No extension found in package.json';			
		}

		if (extension.type === 'bundle') {
			extensions.value = extension.entries.filter((ext: any) => UI_EXTENSIONS.includes(ext.type));
		} else if (UI_EXTENSIONS.includes(extension.type)) {
			if (!extension.name) {
				extension.name = pkg.name;
			}
			extensions.value = [extension];
			extConfig.value.extension = extension.name;
		} else {
			return error.value = `Extension type ${extension.type} is not supported`;
		}

		loadRemoteComponent()
	} catch (e) {
		console.warn(e);
	}
}

// A function to load (or reload) the remote component
async function loadRemoteComponent() {
	if (!extConfig.value.extension) return;
	const extension = extensions.value.find((ext: any) => ext.name === extConfig.value.extension);
	if (!extension) {
		error.value = new Error(`Extension ${extConfig.value.extension} not found in package.json`);
		return;
	};

	const { server, collection, related_collection } = extConfig.value;
	const { source, type } = extension;
	extType.value = type;

	try {
		extOptions.value = {};
		previewSettings.value = {};
		extDefinition.value = null;
		relationFieldType.value = null;
		optionsFields.value = [];
		optionsComponent.value = null;
		extField.value = 'value';
		relationPreview.clear();
		ctx.value = {
			field: {
				type: 'unknown',
				meta: null,
			},
			editing: '+',
			collection,
			relations: {
				o2m: undefined,
				m2o: undefined,
				m2a: undefined,
			},
			collections: {
				related: undefined,
				junction: undefined,
			},
			fields: {
				corresponding: undefined,
				junctionCurrent: undefined,
				junctionRelated: undefined,
				sort: undefined,
			},
			items: {},
			localType: 'standard',
			autoGenerateJunctionRelation: false,
			saving: false,
		};
		error.value = null;
		// Add a timestamp query param so it doesn’t get cached

		/* @vite-ignore */
		const mod = await import(`${server}/${source}`);
		// `mod.default` is the actual SFC options or Vue component object
		const extension = mod.default;
		if (type === 'module') {
			const root = extension.routes.find(r => r.path === '') || extension.routes[0];
			if (!root) {
				throw new Error('No root route found, ensure your module contains at least one route.');
			}
			if (activeRoute) {
				router.replace(`/dev-canvas`);
				router.removeRoute(activeRoute);
			}
			activeRoute = router.addRoute('dev-canvas', {
				...root,
				path: extension.id,
			});
			extensionDef.value = true;
			router.replace(`/dev-canvas/${extension.id}`);
		} else if (type === 'layout') {
			extensionDef.value = extension;
		} else {
			extensionDef.value = extension.component;
			extDefinition.value = extension;

			const localTypes: string[] = extension.localTypes ?? [];
			const localType: RelationLocalType | null = localTypes.includes('m2o')
				? 'm2o'
				: localTypes.includes('o2m')
				? 'o2m'
				: null;
			const preview = relationPreview.apply(localType, collection, related_collection, fieldsStore);

			if (preview) {
				extField.value = preview.field;
				const previewField = preview.fields.find(f => f.field === preview.field);
				ctx.value.relations[preview.type] = preview.relation;
				ctx.value.field.meta = previewField?.meta ?? null;
				relationFieldType.value = previewField?.type ?? null;
			}

			resolveExtensionOptions();
			refreshExt();
		}

		showDialog.value = false;
	} catch (e) {
		console.warn(e);
		error.value = e;
		extensionDef.value = null;
	}
}

hmr();
</script>

<style>
.dev-canvas-toggle {
	position: fixed;
	bottom: 1rem;
	right: 1rem;
	z-index: 1000;
}

.dev-canvas,
.dev-canvas-dialog.v-card {
	--theme--form--row-gap: 24px;
	--v-sheet-padding: 24px;
}

.dev-canvas .module-nav,
.dev-canvas.no-sidebar #sidebar {
	display: none !important;
}

/* Directus 12+ lays private-view out in split panes, which keep their space even when emptied. */
.dev-canvas .root-split {
	grid-template-columns: 0 0 1fr !important;
}

.dev-canvas.no-sidebar .main-split {
	grid-template-columns: 1fr 0 0 !important;
}

.dev-canvas .root-split > .sp-start,
.dev-canvas.no-sidebar .main-split > .sp-end {
	overflow: hidden;
}

.dev-canvas .field {
	padding: 4px 0;
}

.dev-canvas-columns {
	display: flex;
	align-items: flex-start;
	gap: 32px;
}

.dev-canvas-column {
	flex: 1 1 0;
	min-width: 0;
}

.dev-canvas-section-label {
	margin-bottom: 8px;
}

.dev-canvas-options {
	margin-top: 16px;
}

.dev-canvas-refresh {
	margin-top: 16px;
}

@media (max-width: 960px) {
	.dev-canvas-columns {
		flex-direction: column;
	}
}
</style>
