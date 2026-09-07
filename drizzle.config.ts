import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/drizzle/entities',
	out: './migrations',

	dbCredentials: {
		url: './drizzle/dev.sqlite',
	},
})
