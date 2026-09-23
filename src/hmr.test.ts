import { mount } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it } from 'vitest';
import hmr from './hmr';

function defineHmrComponent(hmrId: string, render: () => any) {
	const component: any = defineComponent({ render });
	component.__hmrId = hmrId;
	return component;
}

beforeEach(() => {
	hmr();
});

describe('hmr', () => {
	it('installs the Vue HMR runtime on window exactly once', () => {
		const runtime = window.__VUE_HMR_RUNTIME__;
		expect(runtime).toBeTruthy();
		expect(runtime.createRecord).toBeInstanceOf(Function);
		expect(runtime.rerender).toBeInstanceOf(Function);
		expect(runtime.reload).toBeInstanceOf(Function);

		hmr();
		expect(window.__VUE_HMR_RUNTIME__).toBe(runtime);
	});

	it('rerenders a mounted instance registered under an hmrId', async () => {
		const id = 'rerender-test';
		const Component = defineHmrComponent(id, () => h('div', 'before'));

		window.__VUE_HMR_RUNTIME__.createRecord(id, Component);
		const wrapper = mount(Component);
		expect(wrapper.text()).toBe('before');

		window.__VUE_HMR_RUNTIME__.rerender(id, () => h('div', 'after'));
		await wrapper.vm.$nextTick();

		expect(wrapper.text()).toBe('after');
	});

	it('reloads a mounted instance with a new component definition', async () => {
		const id = 'reload-test';
		const Component = defineHmrComponent(id, () => h('div', 'original'));

		window.__VUE_HMR_RUNTIME__.createRecord(id, Component);
		// Mounted as a child, like the extension component is inside module.vue, so instance.parent exists.
		const Host = defineComponent({ render: () => h(Component) });
		const wrapper = mount(Host);
		expect(wrapper.text()).toBe('original');

		const NewComponent = defineHmrComponent(id, () => h('div', 'updated'));
		window.__VUE_HMR_RUNTIME__.reload(id, NewComponent);
		await wrapper.vm.$nextTick();
		await wrapper.vm.$nextTick();

		expect(wrapper.text()).toBe('updated');
	});

	it('silently ignores updates for an unknown hmrId instead of throwing', () => {
		expect(() => window.__VUE_HMR_RUNTIME__.rerender('does-not-exist', () => h('div'))).not.toThrow();
		expect(() => window.__VUE_HMR_RUNTIME__.reload('does-not-exist', {})).not.toThrow();
	});
});
