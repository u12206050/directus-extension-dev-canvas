declare module '*.vue' {
	import { DefineComponent } from 'vue';
	const component: DefineComponent<{}, {}, any>;
	export default component;
}

interface Window {
	__VUE_HMR_RUNTIME__: {
		records: Record<string, any>;
		createRecord: (id: string, sfc_comp: any) => void;
		reload: (...args: any[]) => void;
		rerender: (id: string, newRender: any) => void;
	};
}
