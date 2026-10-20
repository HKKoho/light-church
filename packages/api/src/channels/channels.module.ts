import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { DbModule } from '../db/db.module.js';
import { EngineModule } from '../engine/engine.module.js';
import { CommandModule } from '../commands/command.module.js';
import { ProviderConfigModule } from '../provider-config/provider-config.module.js';
import { ProviderConfigService } from '../provider-config/provider-config.service.js';
import { ChannelRegistry } from './channel.registry.js';
import { MessageRouterService } from './message-router.service.js';
import { ChannelManagerService } from './channel-manager.service.js';
import { ChannelRepository } from '../db/channel.repository.js';
import { SessionRepository } from '../db/session.repository.js';
import { UserRepository } from '../db/user.repository.js';
import { RedisPubSubService } from '../cache/redis-pubsub.service.js';
import { ChannelsController } from './channels.controller.js';
import { createTelegramAdapter } from './telegram/telegram.adapter.js';
import type { OpenAICredentialsResolver } from './telegram/transcription.js';
import { createWhatsAppAdapter } from './whatsapp/whatsapp.adapter.js';
import { createWebAdapter } from './web/web.adapter.js';
import { WebChatGateway } from './web/web.gateway.js';

@Module({
  imports: [DbModule, EngineModule, JwtModule.register({}), CommandModule, ProviderConfigModule],
  controllers: [ChannelsController],
  providers: [
    ChannelRegistry,
    MessageRouterService,
    WebChatGateway,
    {
      provide: ChannelManagerService,
      useFactory: (
        channelRepo: ChannelRepository,
        registry: ChannelRegistry,
        router: MessageRouterService,
        pubsub: RedisPubSubService,
        sessionRepo: SessionRepository,
        userRepo: UserRepository,
        gateway: WebChatGateway,
        providerConfig: ProviderConfigService,
      ) => {
        // Voice features use the encrypted provider config (env var fallback)
        const resolveOpenAI: OpenAICredentialsResolver = () =>
          providerConfig.resolveProvider('openai').catch(() => null);

        // Register channel adapter factories
        registry.register('telegram', (config) => createTelegramAdapter(config, resolveOpenAI));
        registry.register('whatsapp', (config) => createWhatsAppAdapter(config));
        registry.register('web', (config) => {
          const adapter = createWebAdapter(config);
          gateway.setAdapter(adapter);
          return adapter;
        });

        return new ChannelManagerService(
          channelRepo,
          registry,
          router,
          pubsub,
          sessionRepo,
          userRepo,
        );
      },
      inject: [
        ChannelRepository,
        ChannelRegistry,
        MessageRouterService,
        RedisPubSubService,
        SessionRepository,
        UserRepository,
        WebChatGateway,
        ProviderConfigService,
      ],
    },
  ],
  exports: [MessageRouterService, ChannelManagerService, WebChatGateway],
})
export class ChannelsModule {}
