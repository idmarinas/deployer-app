import { defineConfig } from 'drizzle-kit'

export default defineConfig({
	dialect: 'sqlite',
	schema: './src/drizzle/entities',
	out: './migrations',

	// No se usa.
	// dbCredentials: {
	// 	url: './drizzle/dev.sqlite',
	// },
})
