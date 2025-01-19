<template>
	<component
		:is="layoutWrapper"
		v-if="config && ready"
		v-slot="{ layoutState }"
		v-model:selection="selection"
		v-model:layout-options="layoutOptions"
		v-model:layout-query="layoutQuery"
		:collection="collection">
		<private-view class="dev-canvas" title="Development Canvas">
			<template #actions>
				<component :is="config.slots.actions" v-bind="layoutState" />
			</template>

			<template #sidebar>
				<sidebar-detail icon="layers" :title="t('layout_options')">
					<div class="layout-options">
						<div class="field">
							<div class="type-label">Layout Collection</div>
							<interface-system-collection v-model="collection" placeholder="Select collection" />
						</div>

						<component :is="config.slots.options" v-bind="layoutState" />
					</div>
				</sidebar-detail>
				<component :is="config.slots.sidebar" v-bind="layoutState" />
			</template>

			<component :is="config.component" v-bind="layoutState" />
		</private-view>
	</component>
	<v-notice v-else>Missing layout config</v-notice>
</template>

<script setup lang="ts">
import type { LayoutConfig } from '@directus/extensions';
import { nextTick, ref, toRef, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useLayout } from './use-layout';
const { t } = useI18n();

const props = defineProps<{
	config: LayoutConfig;
}>();

const { layoutWrapper } = useLayout(toRef(props, 'config'));
const ready = ref(true);

const collection = ref('');
const layoutOptions = ref({});
const selection = ref([]);
const layoutQuery = ref({});

const freeze = ref(false);
watch([collection, layoutOptions], () => {
	if (ready.value && !freeze.value) {
		updateLayout();
	}
});

function updateLayout() {
	ready.value = false;
	freeze.value = true;
	nextTick(() => {
		ready.value = true;
		nextTick(() => {
			freeze.value = false;
		});
	});
}
</script>
