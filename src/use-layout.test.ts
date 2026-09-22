import type { LayoutConfig } from '@directus/extensions';
import { mount } from '@vue/test-utils';
import { defineComponent, h, ref } from 'vue';
import { describe, expect, it } from 'vitest';
import { useLayout } from './use-layout';

const Empty = defineComponent({ render: () => null });

function makeLayout(setup: LayoutConfig['setup']): LayoutConfig {
	return {
		id: 'test-layout',
		name: 'Test Layout',
		icon: 'box',
		component: Empty,
		slots: {
			options: Empty,
			sidebar: Empty,
			actions: Empty,
		},
		setup,
	};
}

function mountWrapper(config: LayoutConfig, props: Record<string, unknown> = {}) {
	const { layoutWrapper } = useLayout(ref(config));
	let captured: any;

	const wrapper = mount(layoutWrapper.value, {
		props: { collection: 'articles', ...props },
		slots: {
			default: (scope: any) => {
				captured = scope.layoutState;
				return h('div');
			},
		},
	});

	return { wrapper, get layoutState() { return captured; } };
}

describe('useLayout', () => {
	it('names the wrapper component after the layout id', () => {
		const { layoutWrapper } = useLayout(ref(makeLayout(() => ({}))));
		expect(layoutWrapper.value.name).toBe('test-layout-wrapper');
	});

	it('exposes both the wrapper props and the layout setup state through the default slot', () => {
		const { layoutState } = mountWrapper(
			makeLayout(() => ({ sort: ref('name') })),
			{ selection: ['1'] }
		);

		expect(layoutState.collection).toBe('articles');
		expect(layoutState.selection).toEqual(['1']);
		expect(layoutState.sort).toBe('name');
	});

	it('emits an update event when a writable prop changes', async () => {
		const { wrapper, layoutState } = mountWrapper(makeLayout(() => ({})));

		layoutState['onUpdate:selection'](['2', '3']);
		await wrapper.vm.$nextTick();

		expect(wrapper.emitted('update:selection')).toEqual([[['2', '3']]]);
	});

	it('mutates layout-owned state locally instead of emitting for it', async () => {
		const { wrapper, layoutState } = mountWrapper(makeLayout(() => ({ sort: ref('name') })));

		layoutState['onUpdate:sort']('date');
		await wrapper.vm.$nextTick();

		expect(layoutState.sort).toBe('date');
		expect(wrapper.emitted('update:sort')).toBeUndefined();
	});

	it('creates a fresh wrapper component whenever the layout config changes', () => {
		const config = ref(makeLayout(() => ({})));
		const { layoutWrapper } = useLayout(config);
		const first = layoutWrapper.value;

		config.value = makeLayout(() => ({}));

		expect(layoutWrapper.value).not.toBe(first);
	});
});
