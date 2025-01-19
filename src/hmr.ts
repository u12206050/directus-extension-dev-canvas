import { getCurrentInstance, nextTick, onMounted, onUnmounted, queuePostFlushCb } from 'vue';

let loaded = false;
export default function hmr() {
	if (loaded) return;
	loaded = true;

	let isHmrUpdating = false;
	const hmrDirtyComponents = new Map();
	window.__VUE_HMR_RUNTIME__ = {
		createRecord: tryWrap(createRecord),
		rerender: tryWrap(rerender),
		reload: tryWrap(reload),
	};

	const map = new Map();

	function registerHMR(instance) {
		console.log('registerHMR', instance);
		const id = instance.type.__hmrId;
		let record = map.get(id);
		if (!record) {
			createRecord(id, instance.type);
			record = map.get(id);
		}
		record.instances.add(instance);
	}

	function unregisterHMR(instance) {
		map.get(instance.type.__hmrId).instances.delete(instance);
	}

	function createRecord(id, initialDef) {
		console.log('createRecord', id, initialDef);
		if (map.has(id)) {
			const record = map.get(id);

			record.initialDef = normalizeClassComponent(initialDef);
			[...record.instances].forEach(instance => {
				instance.render = () => null;
				instance.update();
			});

			return false;
		}
		const normalized = normalizeClassComponent(initialDef);
		map.set(id, {
			initialDef: normalized,
			instances: new Set(),
		});

		const origSetup = normalized.setup;
		if (origSetup._isPatched) return true;
		normalized.setup = function (props, context) {
			onMounted(() => {
				registerHMR(getCurrentInstance());
			});
			onUnmounted(() => {
				unregisterHMR(getCurrentInstance());
			});
			return origSetup.call(this, props, context);
		};

		normalized.setup._isPatched = true;
		return true;
	}

	function rerender(id, newRender) {
		console.log('rerender', id);
		const record = map.get(id);
		if (!record) {
			return;
		}
		record.initialDef.render = newRender;
		[...record.instances].forEach(instance => {
			if (newRender) {
				instance.render = newRender;
				normalizeClassComponent(instance.type).render = newRender;
			}
			instance.renderCache = [];
			isHmrUpdating = true;
			instance.update();
			isHmrUpdating = false;
		});
	}

	function reload(id, newComp) {
		console.log('reload', id);
		const record = map.get(id);
		if (!record) return;
		newComp = normalizeClassComponent(newComp);
		updateComponentDef(record.initialDef, newComp);
		const instances = [...record.instances];
		for (let i = 0; i < instances.length; i++) {
			const instance = instances[i];
			const oldComp = normalizeClassComponent(instance.type);
			let dirtyInstances = hmrDirtyComponents.get(oldComp);
			if (!dirtyInstances) {
				if (oldComp !== record.initialDef) {
					updateComponentDef(oldComp, newComp);
				}
				hmrDirtyComponents.set(oldComp, (dirtyInstances = new Set()));
			}
			dirtyInstances.add(instance);
			instance.appContext.propsCache.delete(instance.type);
			instance.appContext.emitsCache.delete(instance.type);
			instance.appContext.optionsCache.delete(instance.type);
			if (instance.ceReload) {
				dirtyInstances.add(instance);
				instance.ceReload(newComp.styles);
				dirtyInstances.delete(instance);
			} else if (instance.parent) {
				nextTick(() => {
					isHmrUpdating = true;
					instance.parent.update();
					isHmrUpdating = false;
					dirtyInstances.delete(instance);
				});
			} else if (instance.appContext.reload) {
				instance.appContext.reload();
			} else if (typeof window !== 'undefined') {
				window.location.reload();
			} else {
				console.warn('[HMR] Root or manually mounted instance modified. Full reload required.');
			}
			if (instance.root.ce && instance !== instance.root) {
				instance.root.ce._removeChildStyle(oldComp);
			}
		}
		queuePostFlushCb(() => {
			hmrDirtyComponents.clear();
		});
	}
}

function normalizeClassComponent(component) {
	return typeof component === 'function' && '__vccOpts' in component ? component.__vccOpts : component;
}

function updateComponentDef(oldComp, newComp) {
	Object.assign(oldComp, newComp);
	for (const key in oldComp) {
		if (key !== '__file' && !(key in newComp)) {
			delete oldComp[key];
		}
	}
}

function tryWrap(fn) {
	return (id, arg) => {
		try {
			return fn(id, arg);
		} catch (e) {
			console.error(e);
			console.warn(`[HMR] Something went wrong during Vue component hot-reload. Full reload required.`);
		}
	};
}
