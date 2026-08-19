import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/lib/entities',
	out: './drizzle/migrations',

	dbCredentials: {
		url: './drizzle/dev.sqlite',
	},
})
