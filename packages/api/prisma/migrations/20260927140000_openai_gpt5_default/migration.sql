-- OpenAI retired gpt-4o and gpt-4o-mini: move existing OpenAI agents to the
-- gpt-5 family so they keep working after the upgrade.
UPDATE "AgentDefinition" SET "model" = 'gpt-5' WHERE "provider" = 'openai' AND "model" = 'gpt-4o';
UPDATE "AgentDefinition" SET "model" = 'gpt-5-mini' WHERE "provider" = 'openai' AND "model" = 'gpt-4o-mini';
