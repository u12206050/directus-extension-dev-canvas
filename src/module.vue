<template>
	<v-dialog v-model="showDialog">
		<v-card class="dev-canvas-dialog">
			<v-card-title>Load Extension</v-card-title>
			<v-card-text>
				<v-form :fields="LoadExtForm" v-model="extConfig" />

				<v-error v-if="error" :error="error" />
			</v-card-text>
			<v-card-actions>
				<v-button @click="loadRemoteComponent">Load It</v-button>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<v-button icon class="dev-canvas-toggle" @click="showDialog = true">
		<v-icon name="developer_board" />
	</v-button>

	<v-progress-linear v-if="!extensionDef" indeterminate />
	<!-- DISPLAYS & INTERFACES -->
	<private-view
		v-else-if="extConfig.type !== 'module' && extConfig.type !== 'layout'"
		class="dev-canvas no-sidebar"
		title="Development Canvas"
		split-view>
		<v-sheet>
			<v-form v-model="extProps" :fields="extFields" />
		</v-sheet>

		<template #splitView>
			<v-sheet v-if="showExt">
				<component
					:is="extensionDef"
					v-bind="extProps"
					:value="testValue"
					:collection="extConfig.collection"
					:field="extField" />
			</v-sheet>
		</template>
	</private-view>
	<!-- LAYOUTS -->
	<LayoutCanvas v-else-if="extConfig.type === 'layout'" :config="extensionDef" />
	<!-- MODULES -->
	<template v-else>
		<router-view />
	</template>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
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


const extConfig = ref({
	type: 'module',
	path: 'http://localhost:5173/src/index.ts',
});
const extCollection = ref('');

// Toggle this between testValue changes to refresh the component
const showExt = ref(true);
const testValue = ref('');

watch(testValue, () => {
	const { type } = extConfig.value;
	if (type === 'display' || type === 'interface') {
		showExt.value = false;
		nextTick(() => {
			showExt.value = true;
		});
	}
});


// For displays, interfaces
const extFields = ref([]);
const extProps = ref({});

// Sync extPath with localStorage
try {
	const storedSettings = localStorage.getItem('dev-canvas-settings');
	if (storedSettings) {
		extConfig.value = JSON.parse(storedSettings);
		if (extConfig.value.path && extConfig.value.type) {
			loadRemoteComponent();
		}
	}
} catch (e) {
	// ignore
}

// Watch for changes and update localStorage
watch(extConfig, (config) => {
	localStorage.setItem('dev-canvas-settings', JSON.stringify(config));
});

const LoadExtForm = [
	{
		name: 'Type',
		field: 'type',
		type: 'string',
		meta: {
			interface: 'select-dropdown',
			required: true,
			options: {
				items: ['module', 'display', 'interface', 'layout'],
			},
		},
	},
	{
		name: 'URI',
		field: 'path',
		type: 'string',
		meta: {
			interface: 'input',
			required: true,
			options: {
				placeholder: 'http://localhost:5173/src/index.ts',
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
						name: "Optional collection",
						rule: {
							type: {
								_nin: ['display', 'interface'],
							},
						},
						hidden: true,
					},
			],
		},
	},
];

const TestValueField = {
	name: 'Test Value',
	field: 'value',
	type: 'string',
	meta: {
		field: 'value',
		special: null,
		interface: 'input',
		options: {
			placeholder: 'Test Value',
		},
	},
};

// A function to load (or reload) the remote component
async function loadRemoteComponent() {
	const { path, type, collection } = extConfig.value;
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
		let fullPath = path;
		if (!fullPath.endsWith('.ts') && !fullPath.endsWith('.js')) {
			fullPath += '/index.ts';
		}
		/* @vite-ignore */
		const mod = await import(fullPath);
		// `mod.default` is the actual SFC options or Vue component object
		const extension = mod.default;
		if (type === 'module') {
			const root = extension.routes.find(r => r.path === '');
			if (!root) {
				throw new Error('No root route found');
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
				TestValueField,
				...(typeof extension.options === 'function' ? extension.options(ctx.value) : extension.options),
			];
		}

		showDialog.value = false;
	} catch (e) {
		console.log(e);
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

.dev-canvas .module-nav,
.dev-canvas.no-sidebar #sidebar {
	display: none !important;
}

.dev-canvas .field {
	padding: 4px 0;
}
</style>
