ALTER TABLE "latitude"."provider_api_keys" DROP CONSTRAINT "provider_apikeys_token_provider_unique";--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "provider_apikeys_token_provider_unique" ON "latitude"."provider_api_keys" USING btree ("token","provider","workspace_id");