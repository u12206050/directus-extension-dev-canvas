import { defineModule } from '@directus/extensions-sdk';
import { h } from 'vue';
import ModuleComponent from './module.vue';

export default defineModule({
	id: 'dev-canvas',
	name: 'Development Canvas',
	icon: 'developer_board',
	routes: [
		{
			name: 'dev-canvas',
			path: '',
			component: ModuleComponent,
			children: [
				{
					path: '',
					component: h('div'),
				},
				{
					path: ':pathMatch(.*)*',
					redirect: { name: 'dev-canvas' },
				},
			],
		},
	],
	preRegisterCheck(user) {
		return user.admin_access;
	},
});
