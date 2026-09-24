import { defineComponent, h, onErrorCaptured, ref, resolveComponent, watch } from 'vue';

/**
 * Catches errors thrown while rendering the previewed extension (commonly in its setup, e.g. a
 * missing relation or injection) and shows them in place, instead of the preview silently
 * rendering nothing.
 */
export default defineComponent({
	name: 'DevCanvasPreviewBoundary',
	props: {
		/** Changing this clears a captured error, e.g. when the preview is remounted. */
		resetKey: {
			type: [String, Number],
			default: 0,
		},
	},
	setup(props, { slots }) {
		const error = ref<unknown>(null);

		watch(
			() => props.resetKey,
			() => (error.value = null),
		);

		onErrorCaptured((err) => {
			console.error('[Dev Canvas] The previewed extension threw an error:', err);
			// Keep the first error: later ones are usually knock-on failures from the same broken setup.
			error.value ??= err;
			return false;
		});

		return () => {
			if (!error.value) return slots.default?.();

			const message = error.value instanceof Error ? error.value.message : String(error.value);
			return h(resolveComponent('v-notice') as any, { type: 'danger' }, () => message);
		};
	},
});
