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
		title="Development Canvas"
		:split-view="!!extensionDef">

		<v-sheet v-if="!extensionDef">
			<v-notice>No extension loaded</v-notice>
		</v-sheet>

		<v-sheet v-else>
			<v-form v-model="extProps" :fields="extFields" />
		</v-sheet>

		<template #splitView>
			<v-sheet v-if="extensionDef && showExt">
				<component
					:is="extensionDef"
					v-bind="extProps"
					:collection="extConfig.collection"
					:field="extField" />
			</v-sheet>
			<br />
			<v-sheet>
				<v-button x-small secondary @click="refreshExt">Refresh</v-button>
			</v-sheet>
		</template>
	</private-view>
	
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { RouterView, useRouter } from 'vue-router';
import LayoutCanvas from './LayoutCanvas.vue';
import hmr from './hmr';

const router = useRouter();
let activeRoute: any;
const showDialog = ref(true);
const ctx = ref();

// This ref will hold the actual component definition
const extensionDef = ref();
const error = ref<any>(null);

const UI_EXTENSIONS = ['display', 'interface', 'layout', 'module', 'bundle'];
const DEFAULTS = {
	server: 'http://localhost:5173',
}
const extConfig = ref(DEFAULTS);
const extCollection = ref('');
const extType = ref('');

// Toggle this between changes to refresh the component
const showExt = ref(true);

// For displays, interfaces
const extFields = ref([]);
const extProps = ref({});

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
	];
});

const TestValueFields = [
	{
		name: 'Test Value',
		field: 'value',
		type: 'string',
		meta: {
			field: 'value',
			interface: 'input',
			options: {
				placeholder: 'Test Value',
			},
		},
	},
];

// Sync extPath with localStorage
try {
	const storedSettings = localStorage.getItem('dev-canvas-settings');
	if (storedSettings) {
		extConfig.value = JSON.parse(storedSettings);
		if (extConfig.value.extension) {
			loadRemoteComponent();
		} else {
			extConfig.value = DEFAULTS;
		}
	}
} catch (e) {
	// ignore
	extConfig.value = DEFAULTS;
}

// Watch for changes and update localStorage
watch(extConfig, (config) => {
	localStorage.setItem('dev-canvas-settings', JSON.stringify(config));
});

watch(() => extConfig.value.server, loadExtensions, { immediate: true });

watch(extProps, refreshExt);

function refreshExt() {
	showExt.value = false;
	nextTick(() => {
		showExt.value = true;
	});
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

	const { server, collection } = extConfig.value;
	const { source, type } = extension;
	extType.value = type;

	try {
		extProps.value = {};
		ctx.value = {
			field: {
				type: 'unknown',
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
			extFields.value = [
				...TestValueFields,
				...(typeof extension.options === 'function' ? extension.options(ctx.value) : extension.options),
			];
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

.dev-canvas .field {
	padding: 4px 0;
}
</style>
